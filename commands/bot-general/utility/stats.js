/**
 * @file stats.js
 * @description Muestra estadísticas técnicas del servidor y bot.
 */

const {
    SlashCommandBuilder, EmbedBuilder, version, PermissionFlagsBits, MessageFlags
} = require('discord.js');
const os = require('os');
const { execSync } = require('child_process');
const { prisma } = require('../../../utils/database');

/**
 * Genera una barra de progreso visual ASCII.
 */
function createProgressBar(current, total, length = 10) {
    const percent = Math.min(Math.max(current / total, 0), 1);
    const filled = Math.round(length * percent);
    const empty = length - filled;
    return '[`' + '█'.repeat(filled) + '░'.repeat(empty) + '`]';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Muestra el estado técnico del sistema (CPU, RAM, DB).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const client = interaction.client;
        const guild = interaction.guild;

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        // 1. Uso de CPU (Aproximación simple con Load Average)
        const load = os.loadavg();
        const cpuUsage = load[0].toFixed(2); // Carga último minuto

        // 2. Uso de RAM
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(1);

        const usedMemMB = (usedMem / 1024 / 1024).toFixed(0);
        const totalMemMB = (totalMem / 1024 / 1024).toFixed(0);

        // 3. Info del Sistema
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor(uptime / 3600) % 24;
        const minutes = Math.floor(uptime / 60) % 60;
        const seconds = Math.floor(uptime % 60);

        // 4. Latencia DB (Prisma Ping) & Conteos
        let dbStatus = "🔴 Desconectado";
        let dbPing = 0;
        let ticketStats = { total: 0, open: 0 };
        let warnCount = 0;
        let errorCount = 0;

        try {
            const startStr = Date.now();
            await prisma.$queryRawUnsafe("SELECT 1"); // Ping
            dbPing = Date.now() - startStr;
            dbStatus = `🟢 Conectado (${dbPing}ms)`;

            // Conteos Database (Paralelo para velocidad)
            const [totalTickets, openTickets, totalWarns, totalErrors] = await Promise.all([
                prisma.ticket.count(),
                prisma.ticket.count({ where: { status: 'open' } }),
                prisma.warnLog.count(),
                prisma.systemError.count()
            ]);

            ticketStats = { total: totalTickets, open: openTickets };
            warnCount = totalWarns;
            errorCount = totalErrors;

        } catch (e) {
            dbStatus = "🔴 Error Conexión";
            console.error("Error fetching DB stats:", e);
        }

        // 5. Commit Hash (Git)
        let gitHash = "Unknown";
        try {
            gitHash = execSync('git rev-parse --short HEAD').toString().trim();
        } catch (e) { }

        // 6. Stats del Discord (Servidor Actual)
        const totalMembers = guild.memberCount;
        const botCount = guild.members.cache.filter(m => m.user.bot).size; // Puede requerir fetch si no están en caché
        const humanCount = totalMembers - botCount; // Aproximado si caché incompleto, pero rápido

        const totalChannels = guild.channels.cache.size;
        const textChannels = guild.channels.cache.filter(c => c.type === 0).size; // GUILD_TEXT
        const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size; // GUILD_VOICE

        const roleCount = guild.roles.cache.size;

        const embed = new EmbedBuilder()
            .setTitle(`📊 Panel de Control | ${client.user.username}`)
            .setColor(0x2b2d31) // Dark theme
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setDescription(`**Estado General del Sistema y ${guild.name}**`)

            // --- BLOQUE RESERVA DE RECURSOS ---
            .addFields(
                {
                    name: "🖥️ Uso de Recursos",
                    value: `> **CPU Load:** \`${cpuUsage}%\`\n> **RAM:** ${createProgressBar(usedMem, totalMem)} \`${memUsagePercent}%\`\n> **Uptime:** ${days}d ${hours}h ${minutes}m`,
                    inline: false
                },
            )

            // --- BLOQUE BASE DE DATOS ---
            .addFields(
                {
                    name: "💾 Base de Datos & Registros",
                    value: `> **Estado:** ${dbStatus}\n> **Warns Registrados:** \`${warnCount}\`\n> **Errores Sistema:** \`${errorCount}\`\n> **Tickets (Tot/Open):** \`${ticketStats.total}\` / \`${ticketStats.open}\``,
                    inline: true
                },
                {
                    name: "🤖 Info del Bot (Global)",
                    value: `> **Versión:** v2.0-indev\n> **Build:** \`${gitHash}\`\n> **Ping WS:** \`${client.ws.ping}ms\`\n> **Servidores:** \`${client.guilds.cache.size}\``,
                    inline: true
                }
            )

            // --- BLOQUE SERVIDOR ACTUAL ---
            .addFields(
                {
                    name: `🏰 Estadísticas de ${guild.name}`,
                    value: `> **👥 Miembros:** ${totalMembers} (👤 ${humanCount} | 🤖 ${botCount})\n> **💬 Canales:** ${totalChannels} (📝 ${textChannels} | 🔊 ${voiceChannels})\n> **🛡️ Roles:** ${roleCount}`,
                    inline: false
                }
            )

            .setFooter({ text: `Solicitado por ${interaction.user.tag} • ${new Date().toLocaleTimeString()}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};