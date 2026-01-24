/**
 * @file database.js
 * @description Módulo de conexión a Base de Datos usando Prisma ORM.
 * Reemplaza la antigua implementación de mysql2.
 */

const { PrismaClient } = require('@prisma/client');

// Instancia única (Singleton) para evitar saturar conexiones
// En desarrollo, evita múltiples instancias por Hot Reload
const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}

/**
 * Inicializa la conexión (opcional, Prisma conecta lazy, pero útil para validar al inicio).
 */
const initDB = async () => {
    try {
        await prisma.$connect();
        console.log("✅ Conexión a Prisma (MariaDB) establecida.");
    } catch (err) {
        console.error("❌ Error conectando Prisma:", err);
    }
};

module.exports = { prisma, initDB };