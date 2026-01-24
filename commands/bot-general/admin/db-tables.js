/**
 * @file db-tables.js
 * @description Comando de diagnóstico para verificar el estado de las tablas en MariaDB.
 * Muestra el conteo de filas en las tablas principales (Settings, Warns, Tickets).
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { pool } = require('../../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('db-tables')
        .setDescription('Muestra un resumen de las tablas actuales en MariaDB')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            // Consultas de conteo para cada tabla crítica
            const [guilds] = await pool.query('SELECT COUNT(*) as count FROM guild_settings');
            const [warns] = await pool.query('SELECT COUNT(*) as count FROM warns');
            const [logs] = await pool.query('SELECT COUNT(*) as count FROM warn_logs');

            // Consultas del Sistema de Tickets
            const [tickets] = await pool.query('SELECT COUNT(*) as count FROM tickets');
            const [ticketActions] = await pool.query('SELECT COUNT(*) as count FROM ticket_actions');
            const [ticketCats] = await pool.query('SELECT COUNT(*) as count FROM ticket_categories');

            const embed = new EmbedBuilder()
                .setTitle('🗄️ Resumen de Base de Datos')
                .setColor(0x3498db)
                .setDescription('Estado actual de las tablas de persistencia.')
                .addFields(
                    { name: '🛡️ Core', value: `Configuraciones: \`${guilds[0].count}\`\nAdvertencias: \`${warns[0].count}\`\nLogs Auditoría: \`${logs[0].count}\``, inline: true },
                    { name: '🎫 Tickets', value: `Tickets Totales: \`${tickets[0].count}\`\nAcciones Reg.: \`${ticketActions[0].count}\`\nCategorías: \`${ticketCats[0].count}\``, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        } catch (error) {
            const { logError } = require('../../../utils/logger');
            await logError(interaction.client, error, "Comando db-tables", interaction.guild.id);
            await interaction.reply({ content: "❌ Error al consultar las tablas.", flags: [MessageFlags.Ephemeral] });
        }
    },
};