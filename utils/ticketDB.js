/**
 * @file ticketDB.js
 * @description Repositorio de Tickets usando Prisma ORM.
 */
const { prisma } = require('./database');

// =============================================================================
//                             GESTIÓN DE CATEGORÍAS
// =============================================================================

async function addTicketCategory(guildId, data) {
    try {
        const { name, description, emoji, roleId, targetCategoryId } = data;

        // Validar Duplicados
        const exists = await prisma.ticketCategory.findFirst({
            where: { guildId, name }
        });

        if (exists) {
            return { success: false, message: '⚠️ Ya existe una categoría con ese nombre.' };
        }

        await prisma.ticketCategory.create({
            data: {
                guildId,
                name,
                description,
                emoji,
                roleId,
                targetCategoryId
            }
        });
        return { success: true };
    } catch (e) {
        console.error("Error creating ticket category:", e);
        return { success: false, message: '❌ Error interno de base de datos.' };
    }
}

async function removeTicketCategory(guildId, name) {
    try {
        await prisma.ticketCategory.deleteMany({
            where: { guildId, name }
        });
        return true;
    } catch (e) {
        console.error("Error removing ticket category:", e);
        return false;
    }
}

async function updateTicketCategory(guildId, currentName, data) {
    try {
        const category = await prisma.ticketCategory.findFirst({
            where: { guildId, name: currentName }
        });

        if (!category) return false;

        const updateData = {};
        if (data.newName) updateData.name = data.newName;
        if (data.description) updateData.description = data.description;
        if (data.emoji) updateData.emoji = data.emoji;
        if (data.roleId) updateData.roleId = data.roleId;
        if (data.targetCategoryId) updateData.targetCategoryId = data.targetCategoryId;

        await prisma.ticketCategory.update({
            where: { id: category.id },
            data: updateData
        });

        return true;
    } catch (e) {
        console.error("Error updating ticket category:", e);
        return false;
    }
}

async function addRoleToCategory(guildId, name, newRoleId) {
    try {
        const category = await getCategoryByName(guildId, name);
        if (!category) return false;

        let roles = [];
        try {
            if (category.roleId.startsWith('[')) {
                roles = JSON.parse(category.roleId);
            } else {
                roles = [category.roleId];
            }
        } catch (e) {
            roles = [category.roleId];
        }

        if (!roles.includes(newRoleId)) {
            roles.push(newRoleId);
            await prisma.ticketCategory.update({
                where: { id: category.id },
                data: { roleId: JSON.stringify(roles) }
            });
        }
        return true;
    } catch (e) {
        console.error("Error adding role to category:", e);
        return false;
    }
}

async function getTicketCategories(guildId) {
    try {
        return await prisma.ticketCategory.findMany({
            where: { guildId }
        });
    } catch (e) {
        console.error("Error fetching categories:", e);
        return [];
    }
}

async function getTicketMetrics(guildId) {
    try {
        const avgTime = await prisma.$queryRaw`
            SELECT AVG(TIMESTAMPDIFF(MINUTE, t.created_at, ta.timestamp)) as avg_minutes 
            FROM tickets t 
            JOIN ticket_actions ta ON t.ticketId = ta.ticketId 
            WHERE t.guildId = ${guildId} AND ta.action = 'CLOSE'
        `;

        const byCategory = await prisma.ticket.groupBy({
            by: ['type'],
            where: { guildId },
            _count: { type: true }
        });

        const catRows = byCategory.map(c => ({ type: c.type, count: c._count.type }));

        const byStaff = await prisma.ticket.groupBy({
            by: ['claimedBy'],
            where: { guildId, claimedBy: { not: null } },
            _count: { claimedBy: true },
            orderBy: { _count: { claimedBy: 'desc' } },
            take: 5
        });

        const staffRows = byStaff.map(s => ({ claimedBy: s.claimedBy, count: s._count.claimedBy }));
        const avgMinutesVal = avgTime[0]?.avg_minutes ? Number(avgTime[0].avg_minutes) : 0;

        return {
            avgResolutionTime: Math.round(avgMinutesVal),
            ticketsByCategory: catRows,
            ticketsByStaff: staffRows
        };
    } catch (e) {
        console.error("Error fetching ticket metrics:", e);
        return null;
    }
}

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
    addTicketCategory,
    removeTicketCategory,
    updateTicketCategory,
    addRoleToCategory,
    getTicketCategories,
    getTicketMetrics,
    getCategoryByName,
    createTicketDB,
    updateTicketChannel,
    closeTicketDB,
    getTicketByChannel,
    assignTicket,
    logTicketActionDB
};