/**
 * @file ticketDB.js
 * @description Capa de abstracción de Base de Datos para el sistema de Tickets.
 * Contiene todas las consultas SQL (queries) para manejar categorías, tickets y logs.
 * Usa connection pool de mysql2.
 */

const pool = require('./database');

// =============================================================================
//                             GESTIÓN DE CATEGORÍAS
// =============================================================================

/**
 * Crea una nueva categoría de tickets en la base de datos.
 * @param {string} guildId - ID del servidor.
 * @param {Object} data - Objeto con name, description, emoji, roleId, targetCategoryId.
 * @returns {Promise<boolean>} True si fue exitoso.
 */
async function addTicketCategory(guildId, data) {
    try {
        const { name, description, emoji, roleId, targetCategoryId } = data;
        await pool.query(
            'INSERT INTO ticket_categories (guildId, name, description, emoji, roleId, targetCategoryId) VALUES (?, ?, ?, ?, ?, ?)',
            [guildId, name, description, emoji, roleId, targetCategoryId]
        );
        return true;
    } catch (e) {
        console.error("Error creating ticket category:", e);
        return false;
    }
}

/**
 * Elimina una categoría por nombre.
 */
async function removeTicketCategory(guildId, name) {
    try {
        await pool.query('DELETE FROM ticket_categories WHERE guildId = ? AND name = ?', [guildId, name]);
        return true;
    } catch (e) {
        console.error("Error removing ticket category:", e);
        return false;
    }
}

/**
 * Actualiza una categoría existente.
 * Soporta cambios parciales (solo lo que venga definido en data).
 */
async function updateTicketCategory(guildId, currentName, data) {
    try {
        const fields = [];
        const params = [];

        if (data.newName) {
            fields.push('name = ?');
            params.push(data.newName);
        }
        if (data.description) {
            fields.push('description = ?');
            params.push(data.description);
        }
        if (data.emoji) {
            fields.push('emoji = ?');
            params.push(data.emoji);
        }
        if (data.roleId) {
            fields.push('roleId = ?');
            params.push(data.roleId);
        }
        if (data.targetCategoryId) {
            fields.push('targetCategoryId = ?');
            params.push(data.targetCategoryId);
        }

        if (fields.length === 0) return false;

        // Añadimos WHERE al final
        params.push(guildId, currentName);

        await pool.query(
            `UPDATE ticket_categories SET ${fields.join(', ')} WHERE guildId = ? AND name = ?`,
            params
        );
        return true;
    } catch (e) {
        console.error("Error updating ticket category:", e);
        return false;
    }
}

/**
 * Añade un rol adicional a la lista de permitidos de una categoría.
 * Maneja la conversión de String simple a JSON Array si es necesario.
 */
async function addRoleToCategory(guildId, name, newRoleId) {
    try {
        const category = await getCategoryByName(guildId, name);
        if (!category) return false;

        let roles = [];
        // Detectar si el campo roleId tiene formato JSON (Array) o es un ID plano
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
            // Actualizamos la DB guardando el array como JSON string
            await pool.query('UPDATE ticket_categories SET roleId = ? WHERE id = ?', [JSON.stringify(roles), category.id]);
        }
        return true;
    } catch (e) {
        console.error("Error adding role to category:", e);
        return false;
    }
}

async function getTicketCategories(guildId) {
    try {
        const [rows] = await pool.query('SELECT * FROM ticket_categories WHERE guildId = ?', [guildId]);
        return rows;
    } catch (e) {
        console.error("Error fetching categories:", e);
        return [];
    }
}

async function getCategoryByName(guildId, name) {
    try {
        const [rows] = await pool.query('SELECT * FROM ticket_categories WHERE guildId = ? AND name = ?', [guildId, name]);
        return rows[0] || null;
    } catch (e) {
        return null;
    }
}

// =============================================================================
//                             GESTIÓN DE TICKETS ACTIVOS
// =============================================================================

/**
 * Registra un nuevo ticket en la tabla 'tickets' y devuelve su ID autoincremental.
 * El ID se usa para nombrar el canal (ticket-0001).
 */
async function createTicketDB(guildId, userId, type) {
    try {
        const [result] = await pool.query(
            'INSERT INTO tickets (guildId, userId, type, status) VALUES (?, ?, ?, "open")',
            [guildId, userId, type]
        );
        return result.insertId;
    } catch (e) {
        console.error("Error creating ticket in DB:", e);
        return null;
    }
}

/**
 * Asocia el ID del canal de Discord creado al ticket en DB.
 */
async function updateTicketChannel(ticketId, channelId) {
    try {
        await pool.query('UPDATE tickets SET channelId = ? WHERE ticketId = ?', [channelId, ticketId]);
    } catch (e) {
        console.error("Error updating ticket channel:", e);
    }
}

/**
 * Asigna el ticket a un miembro del Staff (Claim/Transfer).
 */
async function assignTicket(channelId, staffId) {
    try {
        await pool.query('UPDATE tickets SET claimedBy = ? WHERE channelId = ?', [staffId, channelId]);
        return true;
    } catch (e) {
        console.error("Error assigning ticket:", e);
        return false;
    }
}

/**
 * Registra una acción en el historial (ticket_actions) para estadísticas.
 * @param {string} action - 'OPEN', 'CLAIM', 'TRANSFER', 'CLOSE'
 */
async function logTicketActionDB(ticketId, action, executorId, targetId = null) {
    try {
        await pool.query(
            'INSERT INTO ticket_actions (ticketId, action, executorId, targetId) VALUES (?, ?, ?, ?)',
            [ticketId, action, executorId, targetId]
        );
        // Actualizar timestamp de última actividad
        await pool.query('UPDATE tickets SET lastActivity = NOW() WHERE ticketId = ?', [ticketId]);
    } catch (e) {
        console.error("Error logging ticket action DB:", e);
    }
}

async function closeTicketDB(channelId) {
    try {
        await pool.query('UPDATE tickets SET status = "closed", lastActivity = NOW() WHERE channelId = ?', [channelId]);
    } catch (e) {
        console.error("Error closing ticket in DB:", e);
    }
}

async function getTicketByChannel(channelId) {
    try {
        const [rows] = await pool.query('SELECT * FROM tickets WHERE channelId = ?', [channelId]);
        return rows[0] || null;
    } catch (e) {
        return null;
    }
}

/**
 * Obtiene métricas del sistema de tickets para el dashboard.
 */
async function getTicketMetrics(guildId) {
    try {
        // 1. Tiempo Promedio de Resolución (en Minutos)
        // Se calcula uniendo tickets con su acción de 'CLOSE'
        const [avgTimeRows] = await pool.query(`
            SELECT AVG(TIMESTAMPDIFF(MINUTE, t.created_at, ta.timestamp)) as avg_minutes 
            FROM tickets t 
            JOIN ticket_actions ta ON t.ticketId = ta.ticketId 
            WHERE t.guildId = ? AND ta.action = 'CLOSE'
        `, [guildId]);

        // 2. Tickets por Categoría
        const [catRows] = await pool.query(`
            SELECT type, COUNT(*) as count 
            FROM tickets 
            WHERE guildId = ? 
            GROUP BY type
        `, [guildId]);

        // 3. Tickets por Staff (Top 5)
        const [staffRows] = await pool.query(`
            SELECT claimedBy, COUNT(*) as count 
            FROM tickets 
            WHERE guildId = ? AND claimedBy IS NOT NULL 
            GROUP BY claimedBy 
            ORDER BY count DESC 
            LIMIT 5
        `, [guildId]);

        return {
            avgResolutionTime: Math.round(avgTimeRows[0]?.avg_minutes || 0),
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
