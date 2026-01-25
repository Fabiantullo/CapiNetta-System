/**
 * @file database.js
 * @description Módulo Híbrido: Soporta Prisma (Nuevo) y MySQL2 (Viejo/Legacy).
 */

const { PrismaClient } = require('@prisma/client');
const mysql = require('mysql2/promise'); // Necesitas tener mysql2 instalado aún
require('dotenv').config();
const dbConfig = require('../config').database; // Asegúrate de que esto exista o usa process.env

// 1. Instancia PRISMA (Para el código nuevo)
const globalForPrisma = global;
const prisma = globalForPrisma.prisma || new PrismaClient({
    log: ['error'],
});
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// 2. Instancia POOL MySQL2 (Para el código viejo que aún no migraste)
// Esto evita el crash "Cannot read property pool of undefined"
const pool = mysql.createPool({
    host: process.env.DB_HOST || dbConfig.host,
    user: process.env.DB_USER || dbConfig.user,
    password: process.env.DB_PASSWORD || dbConfig.password,
    database: process.env.DB_NAME || dbConfig.database,
    waitForConnections: true,
    connectionLimit: 5
});

// Exportamos AMBOS
module.exports = { prisma, pool };