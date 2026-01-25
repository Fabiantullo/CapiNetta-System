/**
 * @file router.js
 * @description Router de interacciones de Tickets.
 */
const { MessageFlags, PermissionsBitField } = require('discord.js');
const DB = require('../db');
const Actions = require('./actions');
const { parseRoleIds } = require('../constants');
const { hasPermission, PERMISSIONS } = require('../../permissions');

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
    // --- CONTEXTO DE PERMISOS ---
    const categoryData = await DB.getCategoryByName(guild.id, ticket.type);
    const allowedRoles = parseRoleIds(categoryData.roleId);

    // Objeto de contexto para pasar al verificador
    const permContext = {
        allowedRoles: allowedRoles,
        ownerId: ticket.userId,
        claimedBy: ticket.claimedBy
    };

    // --- ROUTING ---
    switch (customId) {
        case 'claim_ticket':
            if (!hasPermission(member, PERMISSIONS.TICKET.CLAIM, permContext)) {
                return interaction.reply({ content: "🚫 Solo Staff autorizado puede reclamar.", flags: [MessageFlags.Ephemeral] });
            }
            return await Actions.executeClaim(interaction, ticket);

        case 'transfer_ticket':
            if (!hasPermission(member, PERMISSIONS.TICKET.TRANSFER, permContext)) {
                return interaction.reply({ content: "🚫 Solo Staff autorizado puede transferir.", flags: [MessageFlags.Ephemeral] });
            }
            return await Actions.requestTransfer(interaction, ticket);

        case 'confirm_transfer_select':
            return await Actions.executeTransfer(interaction, ticket, interaction.values[0]);

        case 'close_ticket':
            if (!hasPermission(member, PERMISSIONS.TICKET.CLOSE, permContext)) {
                return interaction.reply({
                    content: ticket.claimedBy && ticket.claimedBy !== member.id
                        ? `🚫 Reclamado por <@${ticket.claimedBy}>. Solo él puede cerrarlo.`
                        : "🚫 No tienes permisos para cerrar este ticket.",
                    flags: [MessageFlags.Ephemeral]
                });
            }

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
