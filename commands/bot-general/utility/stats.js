const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, version: djsVersion } = require('discord.js');
const os = require('os');
const { execSync } = require('child_process');
const pool = require('../../../utils/database'); // Para chequear la DB

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Muestra el estado completo del sistema y del bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // 1. Cálculos de Memoria (Sistema vs Proceso)
        const totalMem = (os.totalmem() / (1024 ** 3)).toFixed(2);
        const usedMem = ((os.totalmem() - os.freemem()) / (1024 ** 3)).toFixed(2);
        const processMem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2); // RAM que usa el Bot

        // 2. Almacenamiento
        let diskUsage = "No disponible";
        try {
            const rawDisk = execSync("df -h / | tail -1").toString().trim().split(/\s+/);
            diskUsage = `📊 **Total:** ${rawDisk[1]} | **Libre:** ${rawDisk[3]} (${rawDisk[4]})`;
        } catch (e) { /* Fallback */ }

        // 3. Uptime (Bot vs Sistema)
        const sysUptime = (os.uptime() / 3600).toFixed(1);
        const botUptime = (interaction.client.uptime / 3600000).toFixed(1);

        // 4. Chequeo de Base de Datos (Latencia MariaDB)
        let dbStatus = "🔴 Desconectada";
        try {
            const start = Date.now();
            await pool.query('SELECT 1');
            dbStatus = `🟢 Online (${Date.now() - start}ms)`;
        } catch (e) { dbStatus = "🔴 Error de conexión"; }

        const statsEmbed = new EmbedBuilder()
            .setTitle('🖥️ Panel de Salud del Sistema')
            .setColor(0x2ecc71)
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .addFields(
                {
                    name: '🌐 Presencia del Bot', value: [
                        `**Servidores:** ${interaction.client.guilds.cache.size}`,
                        `**Usuarios:** ${interaction.client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)}`,
                        `**Uptime Bot:** ${botUptime} horas`
                    ].join('\n'), inline: true
                },

                {
                    name: '💾 Recursos de Oracle', value: [
                        `**RAM Sistema:** ${usedMem}GB / ${totalMem}GB`,
                        `**RAM Proceso:** ${processMem}MB`,
                        `**Uptime Sistema:** ${sysUptime} horas`
                    ].join('\n'), inline: true
                },

                { name: '🗄️ Base de Datos', value: dbStatus, inline: true },

                { name: '💿 Almacenamiento en Disco', value: `\`${diskUsage}\``, inline: false },

                {
                    name: '🛠️ Versiones Técnicas', value: [
                        `**Node.js:** ${process.version}`,
                        `**Discord.js:** v${djsVersion}`,
                        `**SO:** ${os.type()} ${os.arch()}`
                    ].join('\n'), inline: false
                }
            )
            .setFooter({ text: `Latencia API: ${interaction.client.ws.ping}ms` })
            .setTimestamp();

        await interaction.reply({ embeds: [statsEmbed] });
    },
};