/**
 * @file permissions.js
 * @description Sistema centralizado de verificación de permisos y roles.
 */

const { PermissionsBitField } = require('discord.js');

const PERMISSIONS = {
    // Tickets
    TICKET: {
        CREATE: 'ticket.create', // Público (generalmente)
        CLAIM: 'ticket.claim',   // Staff (Configurado en Categoría + Staff Global)
        CLOSE: 'ticket.close',   // Owner + Staff (Configurado en Categoría + Staff Global) + Admin
        TRANSFER: 'ticket.transfer', // Staff + Admin
        VIEW_LOGS: 'ticket.view_logs' // Admin
    },
    // Admin General
    ADMIN: {
        SETUP: 'admin.setup',
        MANAGE_ROLES: 'admin.manage_roles',
        BYPASS: 'admin.bypass' // Permiso maestro
    }
};

/**
 * Verifica si un miembro tiene permiso para una acción específica.
 * @param {GuildMember} member - El miembro de Discord a verificar.
 * @param {string} permissionNode - El nodo de permiso (e.g. PERMISSIONS.TICKET.CLAIM).
 * @param {object} context - Contexto dinámico (opcional).
 * @param {string[]} context.allowedRoles - Array de IDs de roles permitidos específicamente para esta acción/categoría.
 * @param {string} context.ownerId - ID del dueño del recurso (ej: ticket owner).
 * @param {string} context.claimedBy - ID del usuario que reclamó el ticket.
 * @returns {boolean} True si tiene permiso.
 */
function hasPermission(member, permissionNode, context = {}) {
    if (!member) return false;

    // 1. GLOBAL OVERRIDE: Administrator
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;

    // 2. Logic Switch
    switch (permissionNode) {
        case PERMISSIONS.TICKET.CLAIM:
            // Solo Staff autorizado para esta categoría (o Staff global si lo implementáramos aquí)
            return checkRoles(member, context.allowedRoles);

        case PERMISSIONS.TICKET.TRANSFER:
            // Solo Staff autorizado
            return checkRoles(member, context.allowedRoles);

        case PERMISSIONS.TICKET.CLOSE:
            // Owner O Staff autorizado O Quien reclamó
            if (context.ownerId && member.id === context.ownerId) return true;
            if (context.claimedBy && member.id === context.claimedBy) return true;

            // Si el ticket está reclamado por OTRO, solo Admin o el mismo claimer pueden cerrar (Admin ya pasó el check global)
            // Aquí definimos: ¿Staff "no claimer" puede cerrar ticket de otro?
            // Regla común: Si está reclamado, SOLO el claimer o Admin. Si NO está reclamado, cualquier Staff.
            if (context.claimedBy && context.claimedBy !== member.id) {
                return false; // Está reclamado por otro y no soy Admin
            }

            return checkRoles(member, context.allowedRoles);

        case PERMISSIONS.ADMIN.SETUP:
        case PERMISSIONS.ADMIN.MANAGE_ROLES:
            // Estos requieren Admin explícito (ya cubierto arriba) o roles específicos si se configuran
            return false;

        default:
            return false;
    }
}

/**
 * Helper interno para chequear si el miembro tiene ALGUNO de los IDs de roles provistos.
 */
function checkRoles(member, allowedRoleIds) {
    if (!allowedRoleIds || !Array.isArray(allowedRoleIds) || allowedRoleIds.length === 0) return false;
    return allowedRoleIds.some(roleId => member.roles.cache.has(roleId));
}

module.exports = {
    PERMISSIONS,
    hasPermission
};
