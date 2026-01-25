/**
 * @file actions.js
 * @description Lógica de negocio para acciones de ticks (Crear, Reclamar, Transferir, Cerrar).
 */
const { PermissionsBitField, ChannelType, MessageFlags } = require('discord.js');
const discordTranscripts = require('discord-html-transcripts');

const DB = require('../db');
const Views = require('../views/embeds');
const Components = require('../views/components');
const { parseRoleIds } = require('../constants');
const { getGuildSettings } = require('../../dataHandler');

async function logTicketActionDiscord(guild, action, ticketChannel, executor, target = null) {
    try {
        const settings = await getGuildSettings(guild.id);
        if (settings && settings.ticketLogsChannel) {
            const logChannel = guild.channels.cache.get(settings.ticketLogsChannel);
            if (logChannel) {
                const embed = Views.buildLogEmbed(action, ticketChannel, executor, target);
                await logChannel.send({ embeds: [embed] });
            }
        }
    } catch (e) {
        console.error("Error logging ticket action (Discord):", e);
    }
}

async function createTicketProcess(interaction, categoryName) {
    try {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const categoryData = await DB.getCategoryByName(interaction.guild.id, categoryName);
        if (!categoryData) return interaction.editReply({ content: "❌ Error: La categoría configurada ya no existe." });

        const ticketId = await DB.createTicketDB(interaction.guild.id, interaction.user.id, categoryName);
        if (!ticketId) return interaction.editReply({ content: "❌ Error fatal de Base de Datos." });

        const paddedId = ticketId.toString().padStart(4, '0');
        const channelName = `ticket-${paddedId}`;
        const allowedRolesIds = parseRoleIds(categoryData.roleId);

        const permissionOverwrites = [
            { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            { id: interaction.client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] }
        ];

        allowedRolesIds.forEach(rId => {
            permissionOverwrites.push({ id: rId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
        });

        const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: categoryData.targetCategoryId || null,
            permissionOverwrites
        });

        await DB.updateTicketChannel(ticketId, ticketChannel.id);

        const embed = Views.buildWelcomeEmbed(categoryName, categoryData.emoji, interaction.user.id, paddedId);
        const row = Components.getTicketControls(false);

        await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });
        await interaction.editReply({ content: `✅ Ticket creado exitosamente: ${ticketChannel}` });

    } catch (e) {
        console.error(e);
        await interaction.editReply({ content: "❌ Ocurrió un error inesperado al intentar crear el canal." });
    }
}

async function executeClaim(interaction, ticket) {
    const { channel, user, guild } = interaction;

    await DB.assignTicket(channel.id, user.id);
    await logTicketActionDiscord(guild, "Ticket Reclamado", channel, user);

    const oldEmbed = interaction.message.embeds[0];
    const newEmbed = Views.buildClaimedEmbed(oldEmbed, user);
    const newRow = Components.getTicketControls(true);

    await interaction.update({ embeds: [newEmbed], components: [newRow] });
    return channel.send({ content: `✅ **${user.username}** ha tomado este ticket.` });
}

async function requestTransfer(interaction, ticket) {
    const row = Components.getTransferSelectMenu();
    return interaction.reply({ content: "Selecciona al miembro del staff a quien transferir:", components: [row], flags: [MessageFlags.Ephemeral] });
}

async function executeTransfer(interaction, ticket, targetUserId) {
    const { channel, user, guild } = interaction;

    await DB.assignTicket(channel.id, targetUserId);
    await logTicketActionDiscord(guild, "Ticket Transferido", channel, user, `<@${targetUserId}>`);

    // Helper para buscar mensaje principal
    const messages = await channel.messages.fetch({ limit: 10 });
    const mainMsg = messages.find(m => m.author.id === channel.client.user.id && m.embeds.length > 0);

    if (mainMsg) {
        const oldEmbed = mainMsg.embeds[0];
        const newEmbed = Views.buildTransferredEmbed(oldEmbed, targetUserId);
        await mainMsg.edit({ embeds: [newEmbed] });
    }

    channel.send({ content: `🔄 Ticket transferido a <@${targetUserId}> por ${user}.` });
    return interaction.update({ content: `✅ Operación exitosa. Transferido a <@${targetUserId}>.`, components: [] });
}

async function requestClose(interaction) {
    const row = Components.getCloseConfirmationButtons();
    return interaction.reply({ content: '❓ **¿Confirmas que deseas cerrar y archivar este ticket?**', components: [row], flags: [MessageFlags.Ephemeral] });
}

async function executeClose(interaction, ticket) {
    const { channel, guild, user } = interaction;
    await interaction.update({ content: '🔒 Procesando cierre y generando transcript...', components: [] });

    try {
        let attachment = null;
        attachment = await discordTranscripts.createTranscript(channel, {
            limit: -1,
            returnType: 'attachment',
            filename: `transcript-${channel.name}.html`,
            saveImages: true,
            footerText: `Exportado el {date} | Capi Netta RP`,
            poweredBy: false
        });

        const settings = await getGuildSettings(guild.id);
        if (settings && settings.ticketLogsChannel) {
            const logChannel = guild.channels.cache.get(settings.ticketLogsChannel);
            if (logChannel) {
                const logEmbed = Views.buildCloseLogEmbed(channel.name, ticket ? ticket.userId : null, user.id, ticket.claimedBy);
                await logChannel.send({ embeds: [logEmbed], files: [attachment] });
            }
        }

        try {
            const ticketUser = await guild.members.fetch(ticket.userId).catch(() => null);
            if (ticketUser) {
                await ticketUser.send({
                    content: `👋 Tu ticket **${channel.name}** en **${guild.name}** ha sido cerrado. Te adjunto el historial de la conversación.`,
                    files: [attachment]
                });
            }
        } catch (dmErr) { /* Ignore */ }

    } catch (err) {
        console.error("Error transcript:", err);
    }

    await DB.closeTicketDB(channel.id, user.id);

    setTimeout(() => {
        channel.delete().catch(() => { });
    }, 5000);
}

module.exports = {
    createTicketProcess,
    executeClaim,
    requestTransfer,
    executeTransfer,
    requestClose,
    executeClose
};
