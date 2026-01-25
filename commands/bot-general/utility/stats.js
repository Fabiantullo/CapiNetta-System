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

        // --- 1. DATOS DEL SISTEMA (OS & NODE) ---
        const load = os.loadavg();
        const cpuUsage = load[0].toFixed(2);
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(1);
        const usedMemMB = (usedMem / 1024 / 1024).toFixed(0);
        const totalMemMB = (totalMem / 1024 / 1024).toFixed(0);

        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor(uptime / 3600) % 24;
        const minutes = Math.floor(uptime / 60) % 60;

        // --- 2. BASE DE DATOS (PRISMA) ---
        let dbStatus = "🔴 Desconectado";
        let dbPing = 0;
        let ticketStats = { total: 0, open: 0, unclaimed: 0 };
        let warnCount = 0;
        let errorCount = 0;

        try {
            const startStr = Date.now();
            await prisma.$queryRawUnsafe("SELECT 1");
            dbPing = Date.now() - startStr;
            dbStatus = `🟢 Conectado (${dbPing}ms)`;

            const [totalT, openT, unclaimedT, totalW, totalE] = await Promise.all([
                prisma.ticket.count(),
                prisma.ticket.count({ where: { status: 'open' } }),
                prisma.ticket.count({ where: { status: 'open', claimedBy: null } }),
                prisma.warnLog.count(),
                prisma.systemError.count()
            ]);

            ticketStats = { total: totalT, open: openT, unclaimed: unclaimedT };
            warnCount = totalW;
            errorCount = totalE;

        } catch (e) {
            dbStatus = "🔴 Error DB";
            console.error("Stats DB Error:", e);
        }

        // --- 3. DATOS DEL SERVIDOR (Discord) ---
        // Fetch full Members to ensure accuracy for Staff/Voice (Heavy operation on big servers, but OK for administrative command)

        const totalMembers = guild.memberCount;
        const botCount = guild.members.cache.filter(m => m.user.bot).size;
        const humanCount = totalMembers - botCount;

        // Nuevos Miembros (Últimas 24h)
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const newMembers = guild.members.cache.filter(m => m.joinedTimestamp > oneDayAgo).size;

        // Usuarios en Voz
        const voiceUsers = guild.members.cache.filter(m => m.voice.channel).size;

        // Staff Online (Aproximación por Permisos + Presencia no Offline)
        const staffOnline = guild.members.cache.filter(m =>
            !m.user.bot &&
            m.permissions.has(PermissionFlagsBits.KickMembers) &&
            m.presence?.status && m.presence.status !== 'offline'
        ).size;

        // Canales
        const totalChannels = guild.channels.cache.size;
        const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;

        // Boosts
        const boostLevel = guild.premiumTier;
        const boostCount = guild.premiumSubscriptionCount || 0;

        // Git Hash
        let gitHash = "Dev";
        try { gitHash = execSync('git rev-parse --short HEAD').toString().trim(); } catch { }

        const embed = new EmbedBuilder()
            .setTitle(`📊 Panel Avanzado | ${client.user.username}`)
            .setDescription(`Resumen técnico y administrativo de **${guild.name}**`)
            .setColor(0x2b2d31)
            .setThumbnail(guild.iconURL({ dynamic: true }))

            // FILA 1: RENDIMIENTO
            .addFields(
                {
                    name: "🖥️ Sistema & Recursos",
                    value: `> **CPU:** \`${cpuUsage}%\`\n> **RAM:** \`${usedMemMB}MB\` / \`${totalMemMB}MB\`\n> **Barra:** ${createProgressBar(usedMem, totalMem)}\n> **Uptime:** \`${days}d ${hours}h ${minutes}m\`\n> **Node/OS:** \`${process.version}\` on \`${os.platform()}\``,
                    inline: true
                },
                {
                    name: "💾 Base de Datos",
                    value: `> **Estado:** ${dbStatus}\n> **Tickets Totales:** \`${ticketStats.total}\`\n> **Tickets Abiertos:** \`${ticketStats.open}\`\n> **⚠️ Sin Atender:** \`${ticketStats.unclaimed}\`\n> **Warns / Errores:** \`${warnCount}\` / \`${errorCount}\``,
                    inline: true
                }
            )

            // FILA 2: SERVIDOR
            .addFields(
                {
                    name: `🏰 Estadísticas de ${guild.name}`,
                    value: `> **👥 Miembros:** \`${totalMembers}\` (👤${humanCount} | 🤖${botCount})\n> **📈 Crecimiento (24h):** \`+${newMembers}\` nuevos\n> **🎙️ En Voz:** \`${voiceUsers}\` usuarios activos\n> **👮 Staff Online:** \`${staffOnline}\` conectados\n> **🚀 Boosts:** Nivel ${boostLevel} (\`${boostCount}\` mejoras)\n> **💬 Canales:** \`${totalChannels}\` (📝${textChannels} | 🔊${voiceChannels})`,
                    inline: false
                }
            )

            // INFO GLOBAL
            .addFields({
                name: "🌐 Global Bot Stats",
                value: `Servidores: \`${client.guilds.cache.size}\` | Ping: \`${client.ws.ping}ms\` | Build: \`${gitHash}\``,
                inline: false
            })

            .setFooter({ text: `Capi Netta RP System • Solicitado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};