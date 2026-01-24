/**
 * @file ticketDB.js
 * @description Capa de abstracción de Base de Datos para el sistema de Tickets.
 * Implementación migrada a Prisma ORM ⚡.
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
        // Obtenemos la categoría primero para tener su ID (Prisma updateMany no es tan flexible para updates condicionales de un solo registro si no es unique)
        // Aunque name+guildId debería ser único lógicamente.
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

async function getCategoryByName(guildId, name) {
    try {
        return await prisma.ticketCategory.findFirst({
            where: { guildId, name }
        });
    } catch (e) {
        return null;
    }
}

// =============================================================================
//                             GESTIÓN DE TICKETS ACTIVOS
// =============================================================================

async function createTicketDB(guildId, userId, type) {
    try {
        const ticket = await prisma.ticket.create({
            data: {
                guildId,
                userId,
                type,
                status: 'open'
            }
        });
        return ticket.ticketId;
    } catch (e) {
        console.error("Error creating ticket in DB:", e);
        return null;
    }
}

async function updateTicketChannel(ticketId, channelId) {
    try {
        await prisma.ticket.update({
            where: { ticketId },
            data: { channelId }
        });
    } catch (e) {
        console.error("Error updating ticket channel:", e);
    }
}

async function assignTicket(channelId, staffId) {
    try {
        // channelId no es PK, así que usamos updateMany
        await prisma.ticket.updateMany({
            where: { channelId },
            data: { claimedBy: staffId }
        });
        return true;
    } catch (e) {
        console.error("Error assigning ticket:", e);
        return false;
    }
}

async function logTicketActionDB(ticketId, action, executorId, targetId = null) {
    try {
        await prisma.ticketAction.create({
            data: {
                ticketId,
                action,
                executorId,
                targetId
            }
        });

        await prisma.ticket.update({
            where: { ticketId },
            data: { lastActivity: new Date() }
        });
    } catch (e) {
        console.error("Error logging ticket action DB:", e);
    }
}

async function closeTicketDB(channelId) {
    try {
        await prisma.ticket.updateMany({
            where: { channelId },
            data: {
                status: 'closed',
                lastActivity: new Date()
            }
        });
    } catch (e) {
        console.error("Error closing ticket in DB:", e);
    }
}

async function getTicketByChannel(channelId) {
    try {
        return await prisma.ticket.findFirst({
            where: { channelId }
        });
    } catch (e) {
        return null;
    }
}

async function getTicketMetrics(guildId) {
    try {
        // En Prisma, agregaciones complejas a veces requieren Raw o lógica JS si son muy específicas.
        // Pero intentaremos usar nativo donde se pueda.

        // 1. Avg Resolution Time - Esto es complejo en Prisma puro sin raw query por el TIMESTAMPDIFF.
        // Usaremos raw query para mantener la eficiencia de SQL en este cálculo específico.
        const avgTime = await prisma.$queryRaw`
            SELECT AVG(TIMESTAMPDIFF(MINUTE, t.created_at, ta.timestamp)) as avg_minutes 
            FROM tickets t 
            JOIN ticket_actions ta ON t.ticketId = ta.ticketId 
            WHERE t.guildId = ${guildId} AND ta.action = 'CLOSE'
        `;

        // 2. Tickets por Categoría
        const byCategory = await prisma.ticket.groupBy({
            by: ['type'],
            where: { guildId },
            _count: {
                type: true
            }
        });

        // Mapeo para mantener compatibilidad con frontend anterior
        const catRows = byCategory.map(c => ({ type: c.type, count: c._count.type }));

        // 3. Tickets por Staff
        const byStaff = await prisma.ticket.groupBy({
            by: ['claimedBy'],
            where: {
                guildId,
                claimedBy: { not: null }
            },
            _count: {
                claimedBy: true
            },
            orderBy: {
                _count: {
                    claimedBy: 'desc'
                }
            },
            take: 5
        });

        const staffRows = byStaff.map(s => ({ claimedBy: s.claimedBy, count: s._count.claimedBy }));

        // Fix para queryRaw que devuelve BigInt a veces
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

module.exports = {
    addTicketCategory,
    removeTicketCategory,
    updateTicketCategory,
    addRoleToCategory,
    getTicketCategories,
    getCategoryByName,
    createTicketDB,
    updateTicketChannel,
    assignTicket,
    logTicketActionDB,
    closeTicketDB,
    getTicketByChannel,
    getTicketMetrics
};
