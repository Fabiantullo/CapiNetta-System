const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, version: djsVersion } = require('discord.js');
const os = require('os');
const { execSync } = require('child_process');
const pool = require('../../../utils/database'); //

/**
 * Genera una barra de progreso visual
 */
function createBar(percent, size = 10) {
    const progress = Math.round(size * (Math.min(percent, 100) / 100));
    const emptyProgress = size - progress;
    const progressText = '▇'.repeat(progress);
    const emptyProgressText = '—'.repeat(emptyProgress);
    return `\`[${progressText}${emptyProgressText}]\` ${percent}%`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Panel visual de salud del sistema, CPU y servidores activos')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // 1. CÁLCULOS DE CPU
        const cpus = os.cpus();
        const load = os.loadavg();
        const cpuUsage = ((load[0] / cpus.length) * 100).toFixed(1);

        // 2. CÁLCULOS DE MEMORIA
        const totalMem = (os.totalmem() / (1024 ** 3)).toFixed(2);
        const freeMem = (os.freemem() / (1024 ** 3)).toFixed(2);
        const usedMem = (totalMem - freeMem).toFixed(2);
        const memPerc = ((usedMem / totalMem) * 100).toFixed(1);
        const processMem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

        // 3. DISCO RÍGIDO
        let diskInfo = { total: '0', used: '0', free: '0', perc: 0 };
        try {
            const rawDisk = execSync("df -h / | tail -1").toString().trim().split(/\s+/);
            diskInfo = { total: rawDisk[1], used: rawDisk[2], free: rawDisk[3], perc: parseInt(rawDisk[4]) };
        } catch (e) { }

        // 4. BASE DE DATOS
        let dbStatus = "🔴 Desconectada";
        try {
            const start = Date.now();
            await pool.query('SELECT 1');
            dbStatus = `🟢 Online (${Date.now() - start}ms)`;
        } catch (e) { }

        // 5. PRESENCIA Y SERVIDORES
        const botUptime = (interaction.client.uptime / 3600000).toFixed(1);
        const guilds = interaction.client.guilds.cache;
        const totalUsers = guilds.reduce((a, g) => a + g.memberCount, 0);

        // Generamos la lista de servidores activos
        const guildList = guilds.map(g => `• **${g.name}** (${g.memberCount} miembros)`).join('\n');

        const statsEmbed = new EmbedBuilder()
            .setTitle('🖥️ Panel de Control | Oracle Cloud')
            .setColor(0x2ecc71)
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .addFields(
                {
                    name: '🌐 Estado General', value: [
                        `**Servidores:** ${guilds.size}`,
                        `**Usuarios Totales:** ${totalUsers}`,
                        `**Uptime:** ${botUptime}h`,
                        `**DB:** ${dbStatus}`
                    ].join('\n'), inline: true
                },

                {
                    name: '⚙️ CPU & RAM', value: [
                        `**CPU:** ${createBar(cpuUsage)}`,
                        `**RAM:** ${createBar(memPerc)}`,
                        `**Proceso:** \`${processMem}MB\``
                    ].join('\n'), inline: true
                },

                { name: '🏘️ Servidores Activos', value: guildList.length > 1024 ? guildList.substring(0, 1021) + '...' : guildList || 'Ninguno', inline: false },

                { name: '💾 Almacenamiento', value: createBar(diskInfo.perc, 20) + `\n\`Usado: ${diskInfo.used} / ${diskInfo.total} (Libre: ${diskInfo.free})\``, inline: false }
            )
            .setFooter({ text: `Latencia API: ${interaction.client.ws.ping}ms | Capi Netta RP` })
            .setTimestamp();

        // Respondemos de forma efímera para que solo vos lo veas
        await interaction.reply({ embeds: [statsEmbed], ephemeral: true });
    },
};