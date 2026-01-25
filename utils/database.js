/**
 * @file database.js
 * @description Módulo Híbrido: Prisma + Pool Falso (para compatibilidad).
 */

const { PrismaClient } = require('@prisma/client');

// 1. Configuración de Prisma
const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}

const initDB = async () => {
    try {
        await prisma.$connect();
        console.log("✅ Conexión a Prisma (MariaDB) establecida.");
    } catch (err) {
        console.error("❌ Error conectando Prisma:", err);
    }
};

// 2. EL SALVAVIDAS (Pool Falso)
// Esto evita que el bot explote con "Cannot destructure property 'pool' of undefined"
const pool = {
    query: async (...args) => {
        console.error("⚠️ ALERTA: Un archivo viejo intentó usar 'pool' (MySQL2). Debes migrarlo a Prisma.");
        return [[]]; // Retorna array vacío para no romper el await
    },
    execute: async (...args) => {
        console.error("⚠️ ALERTA: Un archivo viejo intentó usar 'pool.execute'.");
        return [[]];
    }
};

// 3. Exportamos TODO (Prisma + initDB)
module.exports = { prisma, initDB };