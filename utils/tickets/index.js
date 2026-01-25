/**
 * @file index.js
 * @description Punto de entrada del Módulo Tickets.
 */
const { handleTicketInteraction } = require('./controllers/router');
const DB = require('./db');

// Controladores de Comandos
const categoryHandlers = require('./handlers/categoryHandlers');
const panelHandlers = require('./handlers/panelHandlers');
const metricsHandlers = require('./handlers/metricsHandlers');
const configHandlers = require('./handlers/configHandlers');

module.exports = {
    handleTicketInteraction,
    ...DB, // Exportamos DB functions

    // Handlers (Reemplazando ticketManager)
    ...categoryHandlers,
    ...panelHandlers,
    ...metricsHandlers,
    ...configHandlers
};
