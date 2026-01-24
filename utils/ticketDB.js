const pool = require('./database');

// --- Categorías ---

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

async function removeTicketCategory(guildId, name) {
    try {
        await pool.query('DELETE FROM ticket_categories WHERE guildId = ? AND name = ?', [guildId, name]);
        return true;
    } catch (e) {
        console.error("Error removing ticket category:", e);
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

// --- Tickets ---

async function createTicketDB(guildId, userId, type) {
    try {
        const [result] = await pool.query(
            'INSERT INTO tickets (guildId, userId, type, status) VALUES (?, ?, ?, "open")',
            [guildId, userId, type]
        );
        return result.insertId; // Retorna el ID autoincremental para usar en el nombre del canal
    } catch (e) {
        console.error("Error creating ticket in DB:", e);
        return null;
    }
}

async function updateTicketChannel(ticketId, channelId) {
    try {
        await pool.query('UPDATE tickets SET channelId = ? WHERE ticketId = ?', [channelId, ticketId]);
    } catch (e) {
        console.error("Error updating ticket channel:", e);
    }
}

async function closeTicketDB(channelId) {
    try {
        await pool.query('UPDATE tickets SET status = "closed" WHERE channelId = ?', [channelId]);
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

module.exports = {
    addTicketCategory,
    removeTicketCategory,
    getTicketCategories,
    getCategoryByName,
    createTicketDB,
    updateTicketChannel,
    closeTicketDB,
    getTicketByChannel
};
