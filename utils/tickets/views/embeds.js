/**
 * @file embeds.js
 * @description Generadores de Embeds para Tickets.
 */
const { EmbedBuilder } = require('discord.js');
const { TICKET_COLORS } = require('../constants');

function buildWelcomeEmbed(categoryName, categoryEmoji, userId, ticketNumber) {
    return new EmbedBuilder()
        .setTitle(`${categoryEmoji || '🎫'} ${categoryName} | Ticket #${ticketNumber}`)
        .setDescription(`Hola <@${userId}>, bienvenido al soporte.\n\n**Instrucciones:**\n> Por favor explicá tu situación detalladamente.\n> El equipo de Staff te atenderá a la brevedad.`)
        .setColor(TICKET_COLORS.OPEN)
        .setFooter({ text: "Capi Netta System • Soporte Seguro" })
        .setTimestamp();
}

function buildClaimedEmbed(originalEmbed, claimedByUser) {
    return EmbedBuilder.from(originalEmbed)
        .addFields({ name: "🧑‍💼 Asignado a", value: `${claimedByUser}`, inline: false })
        .setColor(TICKET_COLORS.CLAIMED);
}

function buildTransferredEmbed(originalEmbed, newUserId) {
    // Filtramos campo anterior de asignación si existe
    const newFields = originalEmbed.fields.filter(f => f.name !== "🧑‍💼 Asignado a");
    newFields.push({ name: "🧑‍💼 Asignado a", value: `<@${newUserId}>`, inline: false });

    return EmbedBuilder.from(originalEmbed)
        .setFields(newFields)
        .setColor(TICKET_COLORS.INFO);
}

function buildLogEmbed(action, ticketChannel, executor, target = null) {
    return new EmbedBuilder()
        .setTitle(`Ticket Log: ${action}`)
        .setDescription(`**Canal:** ${ticketChannel}\n**Ejecutado por:** ${executor}\n${target ? `**Objetivo:** ${target}` : ''}`)
        .setColor(TICKET_COLORS.OPEN)
        .setTimestamp();
}

function buildCloseLogEmbed(channelName, authorId, closerId, claimerId) {
    return new EmbedBuilder()
        .setTitle("📝 Ticket Cerrado")
        .addFields(
            { name: "Ticket", value: channelName, inline: true },
            { name: "Autor", value: authorId ? `<@${authorId}>` : "Desconocido", inline: true },
            { name: "Cerrado por", value: `<@${closerId}>`, inline: true },
            { name: "Reclamado por", value: claimerId ? `<@${claimerId}>` : "Nadie", inline: true }
        )
        .setColor(TICKET_COLORS.CLOSED)
        .setTimestamp();
}

module.exports = {
    buildWelcomeEmbed,
    buildClaimedEmbed,
    buildTransferredEmbed,
    buildLogEmbed,
    buildCloseLogEmbed
};
