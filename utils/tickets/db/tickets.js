/**
 * @file tickets.js
 * @description Operaciones CRUD Core de Tickets y Acciones.
 */
const { prisma } = require('../../database');
const { TICKET_STATUS, TICKET_ACTIONS } = require('../constants');

async function createTicketDB(guildId, userId, categoryName) {
    try {
        const ticket = await prisma.ticket.create({
            data: {
                guildId: guildId,
                userId: userId,
                type: categoryName,
                status: TICKET_STATUS.OPEN,
                lastActivity: new Date()
            }
        });

        await logTicketActionDB(ticket.ticketId, TICKET_ACTIONS.OPEN, userId);

        return ticket.ticketId;
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

async function closeTicketDB(channelId, executorId = 'SYSTEM') {
    try {
        const ticket = await prisma.ticket.findFirst({
            where: { channelId: channelId }
        });

        if (!ticket) return false;

        if (ticket.status === TICKET_STATUS.CLOSED) {
            console.warn(`[TicketDB] Intento de cerrar ticket ${ticket.ticketId} ya cerrado.`);
            return false;
        }

        await prisma.ticket.update({
            where: { ticketId: ticket.ticketId },
            data: {
                status: TICKET_STATUS.CLOSED,
                lastActivity: new Date()
            }
        });

        await logTicketActionDB(ticket.ticketId, TICKET_ACTIONS.CLOSE, executorId);

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

        if (ticket.status === TICKET_STATUS.CLOSED) {
            console.warn(`[TicketDB] Intento de asignar ticket cerrado ${ticket.ticketId} a ${userId}.`);
            return false;
        }

        await prisma.ticket.update({
            where: { ticketId: ticket.ticketId },
            data: {
                claimedBy: userId,
                status: TICKET_STATUS.CLAIMED,
                lastActivity: new Date()
            }
        });

        await logTicketActionDB(ticket.ticketId, TICKET_ACTIONS.CLAIM, userId);

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
    createTicketDB,
    updateTicketChannel,
    closeTicketDB,
    getTicketByChannel,
    assignTicket,
    logTicketActionDB
};
