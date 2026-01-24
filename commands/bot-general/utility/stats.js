const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    MessageFlags
} = require('discord.js');
const os = require('os');
const { execSync } = require('child_process');
const pool = require('../../../utils/database'); //

/**
 * Genera una barra de progreso visual
 */
function createBar(percent, size = 10) {
    const progress = Math.round(size * (Math.min(percent, 100) / 100));
    const emptyProgress = size - progress;
    return `\`[${'▇'.repeat(progress)}${'—'.repeat(emptyProgress)}]\` ${percent}%`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Panel visual de salud del sistema, actividad y errores')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const { client } = interaction;

        // 1. CÁLCULOS DE HARDWARE
        const cpuUsage = ((os.loadavg()[0] / os.cpus().length) * 100).toFixed(1);
        const totalMem = (os.totalmem() / (1024 ** 3)).toFixed(2);
        const usedMem = ((os.totalmem() - os.freemem()) / (1024 ** 3)).toFixed(2);
        const memPerc = ((usedMem / totalMem) * 100).toFixed(1);

        // 2. ESTADO DE BASE DE DATOS Y RED
        let dbStatus = "🔴 Desconectada";
        try {
            const start = Date.now();
            await pool.query('SELECT 1');
            dbStatus = `🟢 Online (${Date.now() - start}ms)`;
        } catch (e) { }

        // 3. EMBED PRINCIPAL
        const statsEmbed = new EmbedBuilder()
            .setTitle('🖥️ Panel de Control | Capi Netta System')
            .setColor(0x2ecc71)
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                { name: '🌐 Global', value: `Servers: \`${client.guilds.cache.size}\` | Ping: \`${client.ws.ping}ms\`\nDB: ${dbStatus}`, inline: true },
                { name: '⚙️ CPU & RAM', value: `CPU: ${createBar(cpuUsage)}\nRAM: ${createBar(memPerc)}\nTotal: \`${usedMem} / ${totalMem} GB\``, inline: true }
            )
            .setFooter({ text: "Presioná los botones para ver el historial detallado." })
            .setTimestamp();

        // 4. BOTONES INTERACTIVOS
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('view_activity')
                .setLabel('📑 Actividad Reciente')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('view_errors')
                .setLabel('🚨 Ver Fallos')
                .setStyle(ButtonStyle.Danger)
        );

        const response = await interaction.reply({
            embeds: [statsEmbed],
            components: [row],
            flags: [MessageFlags.Ephemeral]
        });

        // 5. MANEJO DE CLICKS (COLLECTOR)
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 120000 // 2 minutos activo
        });

        collector.on('collect', async i => {
            // --- VISOR DE ACTIVIDAD (LOGS GENERALES) ---
            if (i.customId === 'view_activity') {
                const [rows] = await pool.query(
                    'SELECT action, timestamp FROM activity_logs WHERE guildId = ? ORDER BY timestamp DESC LIMIT 10',
                    [interaction.guild.id]
                );

                if (rows.length === 0) return i.reply({ content: "📭 No hay actividad registrada.", flags: [MessageFlags.Ephemeral] });

                const feed = rows.map(r => `[<t:${Math.floor(r.timestamp / 1000)}:R>] ${r.action.replace(/\*/g, '')}`).join('\n');

                const activityEmbed = new EmbedBuilder()
                    .setTitle("🕒 Últimos 10 movimientos")
                    .setDescription(feed.substring(0, 4000))
                    .setColor(0x3498db);

                await i.reply({ embeds: [activityEmbed], flags: [MessageFlags.Ephemeral] });
            }

            // --- VISOR DE ERRORES (DEBUG) ---
            if (i.customId === 'view_errors') {
                const [errors] = await pool.query('SELECT * FROM system_errors ORDER BY timestamp DESC LIMIT 10');

                if (errors.length === 0) return i.reply({ content: "✅ No hay fallos técnicos registrados.", flags: [MessageFlags.Ephemeral] });

                const errorLog = errors.map(e => `[<t:${Math.floor(e.timestamp / 1000)}:R>] **${e.context}**: ${e.message.substring(0, 80)}...`).join('\n');

                const errorEmbed = new EmbedBuilder()
                    .setTitle("🚨 Últimos 10 Fallos Técnicos")
                    .setDescription(errorLog)
                    .setColor(0xff0000);

                await i.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
            }
        });
    },
};