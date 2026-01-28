/**
 * @file userUpdate.js
 * @description Evento Global. Disparado cuando un usuario cambia su perfil (Avatar, Username, etc).
 * 
 * DESACTIVADO: Causa logs confusos. Si quieres reactivar, implementa sendProfileLog en utils/logger.js
 */

module.exports = {
    name: "userUpdate",
    async execute(client, oldUser, newUser) {
        // Este evento fue desactivado para evitar logs redundantes de cambios de nombre/avatar
        // que confundían con aprobaciones de whitelist.
        // Si necesitas registrar estos cambios, implementa sendProfileLog en utils/logger.js
        return;
    },
};
