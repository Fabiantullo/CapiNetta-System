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

        // 4. Latencia DB (Prisma Ping)
        let dbStatus = "🔴 Desconectado";
        let dbPing = 0;
        try {
            const startStr = Date.now();
            // Ejecutamos una query trivial
            await prisma.$queryRawUnsafe("SELECT 1");
            dbPing = Date.now() - startStr;
            dbStatus = `🟢 Conectado (${dbPing}ms)`;
        } catch (e) {
            dbStatus = "🔴 Error Conexión";
            console.error(e);
        }

        // 5. Commit Hash (Git)
        let gitHash = "Unknown";
        try {
            gitHash = execSync('git rev-parse --short HEAD').toString().trim();
        } catch (e) { }

        const embed = new EmbedBuilder()
            .setTitle("🖥️ Estado del Sistema | Capi Netta RP")
            .setColor(0x2ecc71)
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                {
                    name: "🧠 Memoria RAM",
                    value: `${createProgressBar(usedMem, totalMem)} **${memUsagePercent}%**\n${usedMemMB}MB / ${totalMemMB}MB`,
                    inline: true
                },
                {
                    name: "⚙️ CPU Load (1m)",
                    value: `\`${cpuUsage}%\``,
                    inline: true
                },
                {
                    name: "🗄️ Base de Datos",
                    value: dbStatus,
                    inline: true
                },
                {
                    name: "⏱️ Uptime",
                    value: `${days}d ${hours}h ${minutes}m ${seconds}s`,
                    inline: true
                },
                {
                    name: "🤖 Bot Version",
                    value: `v2.0 (Build: \`${gitHash}\`)`,
                    inline: true
                },
                {
                    name: "📚 Discord.js",
                    value: `v${version}`,
                    inline: true
                }
            )
            .setFooter({ text: "Oracle Cloud Infrastructure • Prisma ORM" })
            .setTimestamp();

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }
};