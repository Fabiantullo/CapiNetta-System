/**
 * @file database.js
 * @description Instancia Singleton de Prisma Client.
 */

const { PrismaClient } = require('@prisma/client');

// Instancia global para evitar múltiples conexiones en desarrollo (hot-reload)
const globalForPrisma = global;

const prisma = globalForPrisma.prisma || new PrismaClient({
    log: ['warn', 'error'], // Opcional: 'query' para ver SQL en consola
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

module.exports = { prisma };