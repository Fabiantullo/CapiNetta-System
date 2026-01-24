/**
 * @file ticketDB.js
 * @description Repositorio de Tickets usando Prisma ORM.
 */
const { prisma } = require('./database');

async function getCategoryByName(guildId, name) {
    try {
        return await prisma.ticketCategory.findFirst({
            where: {
                guildId: guildId,
                name: name
            }
        });
    } catch (error) {
        console.error("Error getCategoryByName:", error);
        return null;
    }
}

async function createTicketDB(guildId, userId, categoryName) {
    try {
        const ticket = await prisma.ticket.create({
            data: {
                guildId: guildId,
                userId: userId,
                type: categoryName,
                status: 'open'
            }
        });
        return ticket.ticketId; // Importante: Devolvemos solo el ID para mantener compatibilidad
    } catch (error) {
        console.error("Error createTicketDB:", error);
        return null;
    }
}

async function updateTicketChannel(ticketId, channelId) {
    try {
        await prisma.ticket.update({
            where: { ticketId: parseInt(ticketId) },
            data: { channelId: channelId }
        });
        return true;
    } catch (error) {
        console.error("Error updateTicketChannel:", error);
        return false;
    }
}

async function closeTicketDB(channelId) {
    try {
        // Buscamos el ticket por channelId primero
        const ticket = await prisma.ticket.findFirst({
            where: { channelId: channelId }
        });

        if (!ticket) return false;

        // Lo marcamos como cerrado
        await prisma.ticket.update({
            where: { ticketId: ticket.ticketId },
            data: { status: 'closed' }
        });
        return true;
    } catch (error) {
        console.error("Error closeTicketDB:", error);
        return false;
    }
}

async function getTicketByChannel(channelId) {
    try {
        return await prisma.ticket.findFirst({
            where: { channelId: channelId }
        });
    } catch (error) {
        console.error("Error getTicketByChannel:", error);
        return null;
    }
}

async function assignTicket(channelId, userId) {
    try {
        const ticket = await prisma.ticket.findFirst({
            where: { channelId: channelId }
        });

        if (!ticket) return false;

        await prisma.ticket.update({
            where: { ticketId: ticket.ticketId },
            data: { claimedBy: userId }
        });
        return true;
    } catch (error) {
        console.error("Error assignTicket:", error);
        return false;
    }
}

async function logTicketActionDB(ticketId, action, executorId, targetId = null) {
    try {
        await prisma.ticketAction.create({
            data: {
                ticketId: parseInt(ticketId),
                action: action,
                executorId: executorId,
                targetId: targetId
            }
        });
    } catch (error) {
        console.error("Error logTicketActionDB:", error);
    }
}

module.exports = {
    getCategoryByName,
    createTicketDB,
    updateTicketChannel,
    closeTicketDB,
    getTicketByChannel,
    assignTicket,
    logTicketActionDB
};