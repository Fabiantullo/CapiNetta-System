/**
 * @file dataHandler.js
 * @description Manejador de datos generales (Warns, Settings) usando Prisma ORM ⚡.
 * @module Utils/DataHandler
 */

const { prisma } = require('./database');

// =============================================================================
//                             GESTIÓN DE ROLES (Persistencia)
// =============================================================================

/**
 * Carga los warns y roles persistidos desde la DB al iniciar.
 * @returns {Promise<Map>} Mapa con estructura { userId: count }
 * Nota: Los roles se cargan bajo demanda generalmente, pero aquí mantenemos el mapa de warns para cache.
 */
async function getWarnsFromDB() {
    const warnMap = new Map();
    try {
        const warns = await prisma.warn.findMany();

        warns.forEach(row => {
            warnMap.set(row.userId, row.count);
        });
        return warnMap;
    } catch (error) {
        console.error("Error loading warns from DB:", error);
        return new Map();
    }
}

/**
 * Guarda o actualiza la cantidad de warns de un usuario.
 * @param {string} userId
 * @param {number} count
 * @param {Array} roles (Opcional) Roles a persistir
 */
async function saveWarnToDB(userId, count, roles = null) {
    // Necesitamos el guildId. En esta arquitectura actual parece que dataHandler asume un guild por defecto o se debería pasar.
    // Revisando el código SQL anterior: `INSERT ... ON DUPLICATE KEY UPDATE`
    // El código original asumía que warns tenía guildId. 
    // Para no romper la firma del método, usaremos el guildId del config general si no se pasa, o intentaremos inferirlo.
    // IMPORTANTE: Prisma requiere todos los campos de @id.
    // Vemos que la firma original era `saveWarnToDB(userId, count)`.

    // WORKAROUND: Como la firma original no tenía guildId explícito, asumiremos el del archivo config para mantener compatibilidad,
    // o deberíamos refactorizar quien lo llama.
    // Mirando `warn.js`, llama a `saveWarnToDB(user.id, currentWarns)`.
    // Vamos a importar config para obtener el GUILD_ID.

    const config = require('../config');
    const guildId = config.general.guildId; // Fallback seguro

    try {
        const dataToUpdate = { count };
        if (roles) {
            dataToUpdate.roles = JSON.stringify(roles);
        }

        await prisma.warn.upsert({
            where: {
                guildId_userId: {
                    guildId: guildId,
                    userId: userId
                }
            },
            update: dataToUpdate,
            create: {
                guildId: guildId,
                userId: userId,
                count: count,
                roles: roles ? JSON.stringify(roles) : null
            }
        });
    } catch (error) {
        console.error("Error saving warn to DB:", error);
    }
}

/**
 * Registra un log de advertencia para auditoría.
 */
async function addWarnLog(userId, moderatorId, reason, warnNumber) {
    try {
        await prisma.warnLog.create({
            data: {
                userId,
                moderatorId,
                reason,
                warnNumber
            }
        });
    } catch (error) {
        console.error("Error adding warn log:", error);
    }
}

// =============================================================================
//                             GUILD SETTINGS
// =============================================================================

async function getGuildSettings(guildId) {
    try {
        return await prisma.guildSettings.findUnique({
            where: { guildId }
        });
    } catch (error) {
        console.error("Error fetching guild settings:", error);
        return null;
    }
}

async function updateGuildSettings(guildId, settings) {
    try {
        await prisma.guildSettings.upsert({
            where: { guildId },
            update: settings,
            create: {
                guildId,
                ...settings
            }
        });
        return true;
    } catch (error) {
        console.error("Error updating guild settings:", error);
        return false;
    }
}

module.exports = {
    getWarnsFromDB,
    saveWarnToDB,
    addWarnLog,
    getGuildSettings,
    updateGuildSettings
};