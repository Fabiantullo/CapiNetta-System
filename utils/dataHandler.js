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
 * @returns {Promise<Map>} Mapa con estructura { guildId: Map<userId, count> }
 * Nota: Se cachea por guild para evitar mezclar contadores entre servidores.
 */
async function getWarnsFromDB() {
    const warnMap = new Map();
    try {
        const warns = await prisma.warn.findMany();

        warns.forEach(row => {
            if (!warnMap.has(row.guildId)) warnMap.set(row.guildId, new Map());
            warnMap.get(row.guildId).set(row.userId, row.count);
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
async function saveWarnToDB(guildId, userId, count, roles = null) {
    if (!guildId) {
        console.error("Error saving warn: guildId requerido");
        return;
    }

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