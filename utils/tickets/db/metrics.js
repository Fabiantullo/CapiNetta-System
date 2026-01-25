/**
 * @file metrics.js
 * @description Cálculo de Métricas (KPIs) de Tickets.
 */
const { prisma } = require('../../database');
const { TICKET_ACTIONS } = require('../constants');

async function getTicketMetrics(guildId) {
    try {
        const avgTime = await prisma.$queryRaw`
            SELECT AVG(TIMESTAMPDIFF(MINUTE, t.created_at, ta.timestamp)) as avg_minutes 
            FROM tickets t 
            JOIN ticket_actions ta ON t.ticketId = ta.ticketId 
            WHERE t.guildId = ${guildId} AND ta.action = ${TICKET_ACTIONS.CLOSE}
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

module.exports = {
    getTicketMetrics
};
