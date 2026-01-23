const mysql = require('mysql2/promise');
require('dotenv').config();
const dbConfig = require('../config').database;

const pool = mysql.createPool({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const initDB = async () => {
    try {
        // Tabla de estado actual (warns activos y roles de cuarentena)
        const warnsTable = `
            CREATE TABLE IF NOT EXISTS warns (
                userId VARCHAR(25) PRIMARY KEY,
                count INT DEFAULT 0,
                roles TEXT DEFAULT NULL, 
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `;

        // Tabla histórica de logs (Auditoría)
        const logsTable = `
            CREATE TABLE IF NOT EXISTS warn_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                userId VARCHAR(25),
                moderatorId VARCHAR(25),
                reason TEXT,
                warnNumber INT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        await pool.query(warnsTable);
        await pool.query(logsTable);
        console.log("✅ Tablas de MariaDB preparadas y sincronizadas.");
    } catch (err) {
        console.error("❌ Error inicializando MariaDB:", err);
    }
};

initDB();

module.exports = pool;