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
        const query = `
            CREATE TABLE IF NOT EXISTS warns (
                userId VARCHAR(25) PRIMARY KEY,
                count INT DEFAULT 0,
                roles TEXT DEFAULT NULL, 
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `;
        await pool.query(query);
        console.log("✅ Tabla MariaDB preparada para guardar roles.");
    } catch (err) {
        console.error("❌ Error inicializando MariaDB:", err);
    }
};

initDB();

module.exports = pool;