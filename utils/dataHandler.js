const pool = require('./database');

async function saveUserRoles(guildId, userId, rolesArray) {
    try {
        const rolesData = JSON.stringify(rolesArray);
        await pool.query(
            'INSERT INTO warns (guildId, userId, roles) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE roles = ?',
            [guildId, userId, rolesData, rolesData]
        );
    } catch (e) { console.error("Error guardando roles:", e); }
}

async function getUserRoles(guildId, userId) {
    try {
        const [rows] = await pool.query('SELECT roles FROM warns WHERE guildId = ? AND userId = ?', [guildId, userId]);
        if (rows.length > 0 && rows[0].roles) return JSON.parse(rows[0].roles);
        return null;
    } catch (e) { return null; }
}

async function clearUserRoles(guildId, userId) {
    try {
        await pool.query('UPDATE warns SET roles = NULL WHERE guildId = ? AND userId = ?', [guildId, userId]);
    } catch (e) { console.error("Error limpiando roles:", e); }
}

// Ahora guarda las advertencias por servidor
async function saveWarnToDB(guildId, userId, count) {
    try {
        await pool.query(
            'INSERT INTO warns (guildId, userId, count) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE count = ?',
            [guildId, userId, count, count]
        );
    } catch (e) { console.error("Error guardando warn:", e); }
}

async function addWarnLog(userId, moderatorId, reason, warnNumber) {
    try {
        await pool.query(
            'INSERT INTO warn_logs (userId, moderatorId, reason, warnNumber) VALUES (?, ?, ?, ?)',
            [userId, moderatorId, reason, warnNumber]
        );
    } catch (e) { console.error("Error en log histórico:", e); }
}

async function getWarnsFromDB() {
    try {
        const [rows] = await pool.query('SELECT userId, count FROM warns');
        const map = new Map();
        rows.forEach(row => map.set(row.userId, row.count));
        return map;
    } catch (e) { return new Map(); }
}

async function getGuildSettings(guildId) {
    try {
        const [rows] = await pool.query('SELECT * FROM guild_settings WHERE guildId = ?', [guildId]);
        return rows[0] || null;
    } catch (e) { return null; }
}

async function updateGuildSettings(guildId, data) {
    // 1. Filtramos valores basura
    const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined && v !== null)
    );
    const keys = Object.keys(cleanData);
    if (keys.length === 0) return;

    // 2. Lógica de "INSERT ... ON DUPLICATE KEY UPDATE"
    // Esto asegura que si cambias un solo campo, los demás se queden como están.
    const insertKeys = ['guildId', ...keys];
    const placeholders = insertKeys.map(() => '?').join(', ');
    const updateClause = keys.map(key => `${key} = VALUES(${key})`).join(', ');
    const values = [guildId, ...Object.values(cleanData)];

    const sql = `INSERT INTO guild_settings (${insertKeys.join(', ')}) 
                 VALUES (${placeholders}) 
                 ON DUPLICATE KEY UPDATE ${updateClause}`;

    try {
        await pool.query(sql, values);
    } catch (err) {
        console.error("❌ Error crítico en MariaDB Upsert:", err);
        throw err;
    }
}

module.exports = {
    getGuildSettings,
    updateGuildSettings,
    saveUserRoles,
    getUserRoles,
    clearUserRoles,
    saveWarnToDB,
    addWarnLog,
    getWarnsFromDB
};