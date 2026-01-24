/**
 * @file stats.js
 * @description Panel integral de estado del sistema.
 * Muestra métricas de hardware (CPU, RAM, Disco) y estadísticas del bot (Uptime, Guilds).
 * Incluye interactividad para ver logs recientes.
 */

const {
    SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits,
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ComponentType, MessageFlags, version: djsVersion
} = require('discord.js');
const os = require('os');
const { execSync } = require('child_process');
const pool = require('../../../utils/database');

/**
 * Genera una barra de progreso visual ASCII.
 * @param {number} percent - Porcentaje (0-100).
 * @param {number} size - Longitud de la barra (caracteres).
 */
function createBar(percent, size = 15) {
    const progress = Math.round(size * (Math.min(percent, 100) / 100));
    const emptyProgress = size - progress;
    return `\`[${'▇'.repeat(progress)}${'—'.repeat(emptyProgress)}]\` ${percent}%`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Panel de salud del sistema, hardware y actividad')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const { client } = interaction;

        // 1. Métricas de Hardware
        const cpuUsage = ((os.loadavg()[0] / os.cpus().length) * 100).toFixed(1);
        const totalMem = (os.totalmem() / (1024 ** 3)).toFixed(2); // GB
        const freeMem = (os.freemem() / (1024 ** 3)).toFixed(2); // GB
        const usedMem = (totalMem - freeMem).toFixed(2);
        const memPerc = ((usedMem / totalMem) * 100).toFixed(1);
        const processMem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2); // MB

        // 2. Métricas de Disco (Linux/Unix command 'df')
        let diskInfo = { total: 'N/A', used: 'N/A', free: 'N/A', perc: 0 };
        try {
            const rawDisk = execSync("df -h / | tail -1").toString().trim().split(/\s+/);
            diskInfo = { total: rawDisk[1], used: rawDisk[2], free: rawDisk[3], perc: parseInt(rawDisk[4]) };
        } catch (e) { /* Windows o falta de permisos ignorado */ }

        // 3. Latencia de Base de Datos
        let dbStatus = "🔴 Desconectada";
        try {
            const start = Date.now();
            await pool.query('SELECT 1'); // Ping a DB
            dbStatus = `🟢 Online (${Date.now() - start}ms)`;
        } catch (e) { }

        // 4. Métricas de Bot
        const guilds = client.guilds.cache;
        const totalUsers = guilds.reduce((a, g) => a + g.memberCount, 0);
        const botUptime = (client.uptime / 3600000).toFixed(1); // Horas
        const guildList = guilds.map(g => `• **${g.name}** (${g.memberCount} miembros)`).join('\n');

        // 5. Construcción del Panel
        const statsEmbed = new EmbedBuilder()
            .setTitle('🖥️ Panel de Control | Capi Netta System')
            .setColor(0x2ecc71) // Verde
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                {
                    name: '🌐 Global', value: [
                        `**Servidores:** ${guilds.size}`,
                        `**Usuarios:** ${totalUsers}`,
                        `**Uptime:** ${botUptime}h`,
                        `**DB:** ${dbStatus}`
                    ].join('\n'), inline: true
                },
                {
                    name: '⚙️ CPU & RAM', value: [
                        `**CPU:** ${createBar(cpuUsage)}`,
                        `**RAM:** ${createBar(memPerc)}`,
                        `**Heap:** \`${processMem}MB\``
                    ].join('\n'), inline: true
                },
                { name: '💾 Almacenamiento', value: `${createBar(diskInfo.perc, 20)}\n\`Usado: ${diskInfo.used} / ${diskInfo.total} (Libre: ${diskInfo.free})\``, inline: false },
                { name: '🏘️ Servidores Activos', value: guildList.length > 1024 ? guildList.substring(0, 1021) + '...' : guildList || 'Ninguno', inline: false }
            )
            .setFooter({ text: `Latencia API: ${client.ws.ping}ms | Discord.js: ${djsVersion}` })
            .setTimestamp();

        // Botones para Drill-down de información
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('view_activity').setLabel('📑 Actividad Reciente').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('view_errors').setLabel('🚨 Ver Fallos').setStyle(ButtonStyle.Danger)
        );

        const response = await interaction.reply({
            embeds: [statsEmbed],
            components: [row],
            flags: [MessageFlags.Ephemeral]
        });

        // 6. Manejo de Botones (Drill-down)
        const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

        collector.on('collect', async i => {
            // Ver Actividad
            if (i.customId === 'view_activity') {
                const [rows] = await pool.query('SELECT action, timestamp FROM activity_logs WHERE guildId = ? ORDER BY timestamp DESC LIMIT 10', [interaction.guild.id]);
                const feed = rows.length > 0 ? rows.map(r => `[<t:${Math.floor(r.timestamp / 1000)}:R>] ${r.action.replace(/\*/g, '')}`).join('\n') : "📭 Sin actividad reciente.";
                await i.reply({ embeds: [new EmbedBuilder().setTitle("🕒 Actividad Reciente").setDescription(feed).setColor(0x3498db)], flags: [MessageFlags.Ephemeral] });
            }

            // Ver Errores
            if (i.customId === 'view_errors') {
                const [errors] = await pool.query('SELECT * FROM system_errors ORDER BY timestamp DESC LIMIT 10');
                const errorLog = errors.length > 0 ? errors.map(e => `[<t:${Math.floor(e.timestamp / 1000)}:R>] **${e.context}**: ${e.message.substring(0, 80)}...`).join('\n') : "✅ Sin errores registrados.";
                await i.reply({ embeds: [new EmbedBuilder().setTitle("🚨 Últimos Fallos").setDescription(errorLog).setColor(0xff0000)], flags: [MessageFlags.Ephemeral] });
            }
        });
    },
};