/**
 * @file router.js
 * @description Router de interacciones de Tickets.
 */
const { MessageFlags, PermissionsBitField } = require('discord.js');
const DB = require('../db');
const Actions = require('./actions');
const { parseRoleIds } = require('../constants');

async function handleTicketInteraction(interaction) {
    const { customId, guild, member, channel } = interaction;

    // --- CREATE TICKET ---
    if (customId.startsWith('create_ticket_')) {
        const categoryName = customId.replace('create_ticket_', '');
        return await Actions.createTicketProcess(interaction, categoryName);
    }

    // --- VALIDACIONES DE CONTEXTO ---
    const ticket = await DB.getTicketByChannel(channel.id);
    if (!ticket) {
        return interaction.reply({ content: "❌ Este canal no es un ticket válido.", flags: [MessageFlags.Ephemeral] });
    }

    // --- PERMISOS STAFF ---
    const categoryData = await DB.getCategoryByName(guild.id, ticket.type);
    const allowedRoles = parseRoleIds(categoryData.roleId);
    const isStaff = allowedRoles.some(r => member.roles.cache.has(r)) || member.permissions.has(PermissionsBitField.Flags.Administrator);
    // const isOwner = ticket.userId === interaction.user.id;

    // --- ROUTING ---
    switch (customId) {
        case 'claim_ticket':
            if (!isStaff) return interaction.reply({ content: "🚫 Solo Staff.", flags: [MessageFlags.Ephemeral] });
            return await Actions.executeClaim(interaction, ticket);

        case 'transfer_ticket':
            if (!isStaff) return interaction.reply({ content: "🚫 Solo Staff.", flags: [MessageFlags.Ephemeral] });
            return await Actions.requestTransfer(interaction, ticket);

        case 'confirm_transfer_select':
            return await Actions.executeTransfer(interaction, ticket, interaction.values[0]);

        case 'close_ticket':
            // Validación de Close request es compleja, delegamos si es viable o movemos validación acá?
            // Movemos validación básica acá por consistencia
            const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
            const isOwner = ticket.userId === interaction.user.id;

            if (ticket.claimedBy && ticket.claimedBy !== interaction.user.id && !isAdmin) {
                return interaction.reply({ content: `🚫 Reclamado por <@${ticket.claimedBy}>. Solo él puede cerrarlo.`, flags: [MessageFlags.Ephemeral] });
            }
            if (!isOwner && !isStaff) return interaction.reply({ content: "🚫 No tienes permisos.", flags: [MessageFlags.Ephemeral] });

            return await Actions.requestClose(interaction);

        case 'confirm_close':
            return await Actions.executeClose(interaction, ticket);

        case 'cancel_close':
            return await interaction.update({ content: '❌ Operación cancelada.', components: [] });

        default:
            return;
    }
}

module.exports = { handleTicketInteraction };
