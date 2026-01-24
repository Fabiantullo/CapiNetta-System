/**
 * @file db-tables.js
 * @description Muestra el estado de la base de datos (conteo de registros).
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { prisma } = require('../../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('db-tables')
        .setDescription('Muestra el conteo de registros en las tablas de MariaDB')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            // Prisma Count API - Mucho más limpio y seguro
            const warns = await prisma.warn.count();
            const logs = await prisma.activityLog.count();
            const tickets = await prisma.ticket.count();
            const ticketActions = await prisma.ticketAction.count();
            const errors = await prisma.systemError.count();
            const categories = await prisma.ticketCategory.count();

            const embed = new EmbedBuilder()
                .setTitle("🗄️ Estado de Base de Datos (MariaDB)")
                .setColor(0xF1C40F)
                .addFields(
                    { name: "Warns (Usuarios Sancionados)", value: `${warns}`, inline: true },
                    { name: "Activity Logs", value: `${logs}`, inline: true },
                    { name: "System Errors", value: `${errors}`, inline: true },
                    { name: "Tickets (Total)", value: `${tickets}`, inline: true },
                    { name: "Ticket Actions (Audit)", value: `${ticketActions}`, inline: true },
                    { name: "Categorías Soporte", value: `${categories}`, inline: true }
                )
                .setFooter({ text: "Managed by Prisma ORM ⚡" })
                .setTimestamp();

            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });

        } catch (error) {
            console.error(error);
            return interaction.reply({ content: "❌ Error consultando la DB.", flags: [MessageFlags.Ephemeral] });
        }
    }
};