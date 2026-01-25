/**
 * @file constants.js
 * @description Constantes y utilidades compartidas para el sistema de tickets.
 */

const TICKET_STATUS = {
    OPEN: 'open',
    CLAIMED: 'claimed',
    CLOSED: 'closed'
};

const TICKET_ACTIONS = {
    OPEN: 'OPEN',
    CLAIM: 'CLAIM',
    CLOSE: 'CLOSE',
    TRANSFER: 'TRANSFER'
};

const TICKET_COLORS = {
    OPEN: 0xF1C40F,     // Amarillo (Sin asignar)
    CLAIMED: 0x2ECC71,  // Verde (Asignado)
    CLOSED: 0xE74C3C,   // Rojo (Cerrado)
    INFO: 0x3498DB      // Azul (Información/Transferencia)
};

/**
 * Parsea el campo roleId que puede venir como String simple o JSON String Array.
 * @param {string} rawRoleId 
 * @returns {string[]} Array de IDs de rol
 */
function parseRoleIds(rawRoleId) {
    if (!rawRoleId) return [];

    // Si ya es un array (por alguna razón de runtime), devolverlo
    if (Array.isArray(rawRoleId)) return rawRoleId;

    try {
        if (rawRoleId.startsWith('[')) {
            return JSON.parse(rawRoleId);
        }
        return [rawRoleId];
    } catch (e) {
        // Fallback: si falla el parseo, asumimos que es un ID simple
        return [rawRoleId];
    }
}

module.exports = {
    TICKET_STATUS,
    TICKET_ACTIONS,
    TICKET_COLORS,
    parseRoleIds
};
