/**
 * @file ticketManager.js
 * @description Archivo "Barrel" (Aggregator) para los controladores de tickets.
 * Centraliza las exportaciones de los módulos en `utils/ticketHandlers/` para
 * que el comando principal (`ticket.js`) solo necesite importar este archivo.
 */

// Importamos los submódulos
const categoryHandlers = require('./ticketHandlers/categoryHandlers');
const panelHandlers = require('./ticketHandlers/panelHandlers');
const metricsHandlers = require('./ticketHandlers/metricsHandlers');
const configHandlers = require('./ticketHandlers/configHandlers');

// Re-exportamos todo unificado
module.exports = {
    ...categoryHandlers,
    ...panelHandlers,
    ...metricsHandlers,
    ...configHandlers
};
