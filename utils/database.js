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
    const query = `
        CREATE TABLE IF NOT EXISTS warns (
            userId VARCHAR(25) PRIMARY KEY,
            count INT DEFAULT 0,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `;
    await pool.query(query);
};

initDB().catch(err => console.error("❌ Error inicializando MariaDB:", err));

module.exports = pool;