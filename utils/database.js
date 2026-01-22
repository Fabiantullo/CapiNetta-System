// CapiNetta-System/utils/database.js
const mysql = require('mysql2/promise');
const config = require('../config').database; // Aquí config ya es el objeto database

const pool = mysql.createPool({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Inicialización de la tabla
const initDB = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS warns (
            userId VARCHAR(25) PRIMARY KEY,
            count INT DEFAULT 0,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `;
    await pool.query(query);
};

initDB().catch(err => console.error("❌ Error inicializando DB:", err));

module.exports = pool;