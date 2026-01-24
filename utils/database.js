/**
 * @file database.js
 * @description Módulo de conexión a Base de Datos (MariaDB/MySQL).
 * Gestiona el pool de conexiones y la inicialización de tablas (Schema Migration).
 */

const mysql = require('mysql2/promise');
require('dotenv').config();
const dbConfig = require('../config').database;

// Crear Pool de Conexiones
const pool = mysql.createPool({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

/**
 * Inicializa la estructura de la base de datos.
 * Crea las tablas si no existen y aplica migraciones de columnas faltantes.
 */
const initDB = async () => {
    try {
        // 1. Configuración de Servidores (Guild Settings)
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
                ticketLogsChannel VARCHAR(25),
                isSetup BOOLEAN DEFAULT FALSE
            )
        `;

        // 2. Estado de Usuarios (Warns y Persistencia de Roles)
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

        // 3. Actividad General (Logs auditables para /stats)
        const activityTable = `
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guildId VARCHAR(25),
                userId VARCHAR(25),
                action TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // 3.1 Historial Advertencias (Warn Logs Detallados)
        const warnLogsTable = `
            CREATE TABLE IF NOT EXISTS warn_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                userId VARCHAR(25),
                moderatorId VARCHAR(25),
                reason TEXT,
                warnNumber INT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // 4. Fallos Técnicos (Error Tracking)
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
                roleId TEXT,
                targetCategoryId VARCHAR(25),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // 6. Sistema de Tickets - Tickets Activos e Instancias
        const ticketsTable = `
            CREATE TABLE IF NOT EXISTS tickets (
                ticketId INT AUTO_INCREMENT PRIMARY KEY,
                guildId VARCHAR(25),
                userId VARCHAR(25),
                channelId VARCHAR(25),
                status VARCHAR(20) DEFAULT 'open',
                type VARCHAR(100),
                claimedBy VARCHAR(25) DEFAULT NULL,
                lastActivity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // 7. Sistema de Tickets - Logs de Acciones
        const ticketActionsTable = `
            CREATE TABLE IF NOT EXISTS ticket_actions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ticketId INT,
                action VARCHAR(50), 
                executorId VARCHAR(25),
                targetId VARCHAR(25),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Ejecución Secuencial
        await pool.query(guildSettingsTable);

        // Migraciones de columnas (ALTER TABLE seguros)
        try { await pool.query("ALTER TABLE guild_settings ADD COLUMN ticketLogsChannel VARCHAR(25)"); } catch (e) { }
        try { await pool.query("ALTER TABLE ticket_categories MODIFY COLUMN roleId TEXT"); } catch (e) { }
        try { await pool.query("ALTER TABLE tickets ADD COLUMN claimedBy VARCHAR(25) DEFAULT NULL"); } catch (e) { }
        try { await pool.query("ALTER TABLE tickets ADD COLUMN lastActivity TIMESTAMP DEFAULT CURRENT_TIMESTAMP"); } catch (e) { }

        await pool.query(warnsTable);
        await pool.query(activityTable);
        await pool.query(warnLogsTable);
        await pool.query(errorsTable);
        await pool.query(ticketCategoriesTable);
        await pool.query(ticketsTable);
        await pool.query(ticketActionsTable);

        console.log("✅ Tablas de MariaDB preparadas y sincronizadas.");
    } catch (err) {
        console.error("❌ Error inicializando MariaDB:", err);
    }
};

initDB();

module.exports = pool;