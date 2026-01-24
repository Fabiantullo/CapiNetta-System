/**
 * @file dataHandler.js
 * @description Módulo para consultas específicas de usuarios y configuraciones en DB.
 * Actúa como una capa intermedia entre la lógica de negocio y `database.js`.
 * 
 * @module Utils/DataHandler
 */

const pool = require('./database');

// =============================================================================
//                             GESTIÓN DE ROLES (Persistencia)
// =============================================================================

/**
 * Guarda el array de roles de un usuario en la base de datos (para reasignar al volver).
 * @param {string} guildId - ID del servidor.
 * @param {string} userId - ID del usuario.
 * @param {string[]} rolesArray - Lista de IDs de roles.
 */
async function saveUserRoles(guildId, userId, rolesArray) {
    try {
        const rolesData = JSON.stringify(rolesArray);
        await pool.query(
            'INSERT INTO warns (guildId, userId, roles) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE roles = ?',
            [guildId, userId, rolesData, rolesData]
        );
    } catch (e) {
        console.error("Error guardando roles:", e);
    }
}

/**
 * Recupera los roles guardados de un usuario.
 * @returns {Promise<string[]|null>} Array de IDs de roles o null.
 */
async function getUserRoles(guildId, userId) {
    try {
        const [rows] = await pool.query('SELECT roles FROM warns WHERE guildId = ? AND userId = ?', [guildId, userId]);
        if (rows.length > 0 && rows[0].roles) return JSON.parse(rows[0].roles);
        return null;
    } catch (e) { return null; }
}

/**
 * Limpia el registro de roles guardados (ej cuando ya se restauraron).
 */
async function clearUserRoles(guildId, userId) {
    try {
        await pool.query('UPDATE warns SET roles = NULL WHERE guildId = ? AND userId = ?', [guildId, userId]);
    } catch (e) { console.error("Error limpiando roles:", e); }
}

// =============================================================================
//                             SISTEMA DE WARNS (Advertencias)
// =============================================================================

/**
 * Actualiza el contador de warns de un usuario.
 */
async function saveWarnToDB(guildId, userId, count) {
    try {
        await pool.query(
            'INSERT INTO warns (guildId, userId, count) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE count = ?',
            [guildId, userId, count, count]
        );
    } catch (e) { console.error("Error guardando warn:", e); }
}

/**
 * Registra una entrada en el historial detallado de warns (logs eternos).
 */
async function addWarnLog(userId, moderatorId, reason, warnNumber) {
    try {
        await pool.query(
            'INSERT INTO warn_logs (userId, moderatorId, reason, warnNumber) VALUES (?, ?, ?, ?)',
            [userId, moderatorId, reason, warnNumber]
        );
    } catch (e) { console.error("Error en log histórico:", e); }
}

/**
 * Obtiene un mapa de todos los usuarios con warns activos.
 * @returns {Promise<Map<string, number>>} Map<UserId, Count>
 */
async function getWarnsFromDB() {
    try {
        const [rows] = await pool.query('SELECT userId, count FROM warns');
        const map = new Map();
        rows.forEach(row => map.set(row.userId, row.count));
        return map;
    } catch (e) { return new Map(); }
}

// =============================================================================
//                             CONFIGURACIÓN DE SERVIDOR
// =============================================================================

/**
 * Obtiene la configuración específica de un servidor (canales, roles, etc).
 */
async function getGuildSettings(guildId) {
    try {
        const [rows] = await pool.query('SELECT * FROM guild_settings WHERE guildId = ?', [guildId]);
        return rows[0] || null;
    } catch (e) { return null; }
}

/**
 * Actualiza o Crea la configuración de un servidor.
 * Genera dinámicamente la query SQL en base a los campos recibidos en `data`.
 * @param {Object} data - Objeto parcial con claves-valor a actualizar (ej: { logsChannel: '123' }).
 */
async function updateGuildSettings(guildId, data) {
    const keys = Object.keys(data);
    if (keys.length === 0) return;

    const insertKeys = ['guildId', ...keys];
    // Preparar placeholders (?,?)
    const placeholders = insertKeys.map(() => '?').join(', ');
    // Preparar cláusula ON DUPLICATE KEY UPDATE key = VALUES(key)
    const updateClause = keys.map(key => `${key} = VALUES(${key})`).join(', ');
    const values = [guildId, ...Object.values(data)];

    const sql = `INSERT INTO guild_settings (${insertKeys.join(', ')}) 
                 VALUES (${placeholders}) 
                 ON DUPLICATE KEY UPDATE ${updateClause}`;

    await pool.query(sql, values);
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