const pool = require('./database');

async function saveUserRoles(userId, rolesArray) {
    try {
        const rolesData = JSON.stringify(rolesArray);
        await pool.query(
            'INSERT INTO warns (userId, roles) VALUES (?, ?) ON DUPLICATE KEY UPDATE roles = ?',
            [userId, rolesData, rolesData]
        );
    } catch (e) { console.error("Error guardando roles:", e); }
}

async function getUserRoles(userId) {
    try {
        const [rows] = await pool.query('SELECT roles FROM warns WHERE userId = ?', [userId]);
        if (rows.length > 0 && rows[0].roles) return JSON.parse(rows[0].roles);
        return null;
    } catch (e) { return null; }
}

async function clearUserRoles(userId) {
    try {
        await pool.query('UPDATE warns SET roles = NULL WHERE userId = ?', [userId]);
    } catch (e) { console.error("Error limpiando roles:", e); }
}

async function saveWarnToDB(userId, count) {
    try {
        await pool.query(
            'INSERT INTO warns (userId, count) VALUES (?, ?) ON DUPLICATE KEY UPDATE count = ?',
            [userId, count, count]
        );
    } catch (e) { console.error(e); }
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

module.exports = { saveUserRoles, getUserRoles, clearUserRoles, saveWarnToDB, addWarnLog, getWarnsFromDB };