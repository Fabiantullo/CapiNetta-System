const pool = require('./database');

async function saveUserRoles(userId, rolesArray) {
    try {
        const rolesData = JSON.stringify(rolesArray);
        await pool.query(
            'INSERT INTO warns (userId, roles) VALUES (?, ?) ON DUPLICATE KEY UPDATE roles = ?',
            [userId, rolesData, rolesData]
        );
    } catch (e) {
        console.error("Error guardando roles en DB:", e);
    }
}

async function getUserRoles(userId) {
    try {
        const [rows] = await pool.query('SELECT roles FROM warns WHERE userId = ?', [userId]);
        if (rows.length > 0 && rows[0].roles) {
            return JSON.parse(rows[0].roles);
        }
        return null;
    } catch (e) {
        console.error("Error obteniendo roles de DB:", e);
        return null;
    }
}

async function saveWarnToDB(userId, count) {
    try {
        await pool.query(
            'INSERT INTO warns (userId, count) VALUES (?, ?) ON DUPLICATE KEY UPDATE count = ?',
            [userId, count, count]
        );
    } catch (e) { console.error(e); }
}

module.exports = { saveUserRoles, getUserRoles, saveWarnToDB };