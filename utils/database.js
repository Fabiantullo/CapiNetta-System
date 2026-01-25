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

module.exports = { prisma, initDB };