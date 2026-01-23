const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const pool = require('../../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('db-tables')
        .setDescription('Muestra un resumen de las tablas actuales en MariaDB')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            // Consultamos las tablas configuradas en database.js
            const [guilds] = await pool.query('SELECT COUNT(*) as count FROM guild_settings');
            const [warns] = await pool.query('SELECT COUNT(*) as count FROM warns');
            const [logs] = await pool.query('SELECT COUNT(*) as count FROM warn_logs');

            const embed = new EmbedBuilder()
                .setTitle('🗄️ Resumen de Base de Datos')
                .setColor(0x3498db)
                .setDescription('Estado actual de las tablas de persistencia.')
                .addFields(
                    { name: '🛡️ Config Servidores', value: `\`${guilds[0].count}\` servidores registrados.`, inline: false },
                    { name: '⚠️ Advertencias Activas', value: `\`${warns[0].count}\` usuarios con historial/roles.`, inline: false },
                    { name: '📜 Logs Históricos', value: `\`${logs[0].count}\` registros de auditoría.`, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            const { logError } = require('../../../utils/logger');
            await logError(interaction.client, error, "Comando db-tables", interaction.guild.id);
            await interaction.reply({ content: "❌ Error al consultar las tablas.", ephemeral: true });
        }
    },
};