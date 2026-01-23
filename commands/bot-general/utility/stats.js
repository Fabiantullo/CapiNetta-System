const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, version: djsVersion } = require('discord.js');
const os = require('os');
const { execSync } = require('child_process');
const pool = require('../../../utils/database');

// Función para crear barras de progreso visuales
function createBar(percent, size = 10) {
    const progress = Math.round(size * (percent / 100));
    const emptyProgress = size - progress;
    const progressText = '▇'.repeat(progress);
    const emptyProgressText = '—'.repeat(emptyProgress);
    return `\`[${progressText}${emptyProgressText}]\` ${percent}%`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Panel visual de salud del sistema y del bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // 1. Cálculos de Memoria
        const totalMem = (os.totalmem() / (1024 ** 3)).toFixed(2);
        const freeMem = (os.freemem() / (1024 ** 3)).toFixed(2);
        const usedMem = (totalMem - freeMem).toFixed(2);
        const memPerc = ((usedMem / totalMem) * 100).toFixed(1);
        const processMem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

        // 2. Almacenamiento
        let diskInfo = { total: '0', used: '0', free: '0', perc: 0 };
        try {
            const rawDisk = execSync("df -h / | tail -1").toString().trim().split(/\s+/);
            diskInfo = { total: rawDisk[1], used: rawDisk[2], free: rawDisk[3], perc: parseInt(rawDisk[4]) };
        } catch (e) { /* Fallback */ }

        // 3. Base de Datos
        let dbStatus = "🔴 Desconectada";
        try {
            const start = Date.now();
            await pool.query('SELECT 1');
            dbStatus = `🟢 Online (${Date.now() - start}ms)`;
        } catch (e) { dbStatus = "🔴 Error"; }

        const statsEmbed = new EmbedBuilder()
            .setTitle('🖥️ Panel de Control | Oracle Cloud')
            .setColor(0x2ecc71)
            .addFields(
                {
                    name: '🌐 Estado del Bot', value: [
                        `**Servidores:** ${interaction.client.guilds.cache.size}`,
                        `**Uptime:** ${(interaction.client.uptime / 3600000).toFixed(1)}h`,
                        `**DB:** ${dbStatus}`
                    ].join('\n'), inline: true
                },

                {
                    name: '🧠 Memoria RAM', value: [
                        createBar(memPerc),
                        `\`${usedMem}GB / ${totalMem}GB\``,
                        `*Bot usa: ${processMem}MB*`
                    ].join('\n'), inline: true
                },

                {
                    name: '💾 Disco Rígido', value: [
                        createBar(diskInfo.perc),
                        `\`${diskInfo.used} / ${diskInfo.total} (Libre: ${diskInfo.free})\``
                    ].join('\n'), inline: false
                },

                { name: '🛠️ Software', value: `\`Node: ${process.version}\` | \`D.js: v${djsVersion}\``, inline: false }
            )
            .setFooter({ text: `Latencia API: ${interaction.client.ws.ping}ms` })
            .setTimestamp();

        await interaction.reply({ embeds: [statsEmbed] });
    },
};