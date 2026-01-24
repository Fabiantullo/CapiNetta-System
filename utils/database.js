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
        // 1. Configuración de Servidores
        const guildSettingsTable = `
            CREATE TABLE IF NOT EXISTS guild_settings (
                guildId VARCHAR(25) PRIMARY KEY,
                logsChannel VARCHAR(25),
                debugChannel VARCHAR(25),
                verifyChannel VARCHAR(25),
                welcomeChannel VARCHAR(25),
                supportChannel VARCHAR(25),
                roleUser VARCHAR(25),
                roleNoVerify VARCHAR(25),
                roleMuted VARCHAR(25),
                isSetup BOOLEAN DEFAULT FALSE
            )
        `;

        // 2. Estado de Usuarios (Warns y Roles)
        const warnsTable = `
            CREATE TABLE IF NOT EXISTS warns (
                guildId VARCHAR(25),
                userId VARCHAR(25),
                count INT DEFAULT 0,
                roles TEXT DEFAULT NULL, 
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (guildId, userId)
            )
        `;

        // 3. Actividad General (Para el botón de Stats)
        const activityTable = `
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guildId VARCHAR(25),
                userId VARCHAR(25),
                action TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // 4. Fallos Técnicos (Para el botón de Stats)
        const errorsTable = `
            CREATE TABLE IF NOT EXISTS system_errors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                context VARCHAR(100),
                message TEXT,
                stack TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // 5. Sistema de Tickets - Categorías
        const ticketCategoriesTable = `
            CREATE TABLE IF NOT EXISTS ticket_categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guildId VARCHAR(25),
                name VARCHAR(100),
                description VARCHAR(255),
                emoji VARCHAR(50),
                roleId VARCHAR(25),
                targetCategoryId VARCHAR(25),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // 6. Sistema de Tickets - Tickets Activos e Historial
        const ticketsTable = `
            CREATE TABLE IF NOT EXISTS tickets (
                ticketId INT AUTO_INCREMENT PRIMARY KEY,
                guildId VARCHAR(25),
                userId VARCHAR(25),
                channelId VARCHAR(25),
                status VARCHAR(20) DEFAULT 'open',
                type VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Ejecución de creación de tablas
        await pool.query(guildSettingsTable);
        await pool.query(warnsTable);
        await pool.query(activityTable);
        await pool.query(errorsTable);
        await pool.query(ticketCategoriesTable);
        await pool.query(ticketsTable);

        console.log("✅ Tablas de MariaDB preparadas y sincronizadas.");
    } catch (err) {
        console.error("❌ Error inicializando MariaDB:", err);
    }
};

initDB();

module.exports = pool;