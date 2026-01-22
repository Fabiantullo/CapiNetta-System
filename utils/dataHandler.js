const pool = require('./database');

async function getWarnsFromDB() {
    try {
        const [rows] = await pool.query('SELECT userId, count FROM warns');
        const warnMap = new Map();
        rows.forEach(row => warnMap.set(row.userId, row.count));
        return warnMap;
    } catch (e) {
        console.error("Error cargando warns desde DB:", e);
        return new Map();
    }
}

async function saveWarnToDB(userId, count) {
    try {
        await pool.query(
            'INSERT INTO warns (userId, count) VALUES (?, ?) ON DUPLICATE KEY UPDATE count = ?',
            [userId, count, count]
        );
    } catch (e) {
        console.error("Error guardando warn en DB:", e);
    }
}

async function resetWarnsInDB(userId) {
    try {
        await pool.query('DELETE FROM warns WHERE userId = ?', [userId]);
    } catch (e) {
        console.error("Error reseteando warns en DB:", e);
    }
}

module.exports = { getWarnsFromDB, saveWarnToDB, resetWarnsInDB };