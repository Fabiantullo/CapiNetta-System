/**
 * @file index.js
 * @description Facade para la capa de Datos (DB) de Tickets.
 */

const categories = require('./categories');
const tickets = require('./tickets');
const metrics = require('./metrics');

module.exports = {
    ...categories,
    ...tickets,
    ...metrics
};
