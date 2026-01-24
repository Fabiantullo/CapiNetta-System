/**
 * @file userUpdate.js
 * @description Evento Global. Disparado cuando un usuario cambia su perfil (Avatar, Username, etc).
 * 
 * Nota: Como este evento no está atado a un Guild específico, intentamos buscar el "Main Guild"
 * desde la configuración global (`config.js`) para enviar el log allí si el usuario pertenece.
 */

const { sendProfileLog } = require("../../utils/logger");
const config = require("../../config");

module.exports = {
    name: "userUpdate",
    async execute(client, oldUser, newUser) {
        // Intentar obtener el servidor principal
        const mainGuildId = config.general.guildId;
        if (!mainGuildId) return; // Si no hay servidor principal configurado, ignoramos para no saturar API

        try {
            const guild = await client.guilds.fetch(mainGuildId).catch(() => null);
            if (!guild) return;

            // Verificar si el usuario está en ese servidor
            const member = await guild.members.fetch(newUser.id).catch(() => null);
            if (!member) return;

            // Detectar cambios
            if (oldUser.username !== newUser.username) {
                sendProfileLog(client, newUser, "Username", `**${oldUser.username}** → **${newUser.username}**`, mainGuildId);
            }
            if (oldUser.avatar !== newUser.avatar) {
                sendProfileLog(client, newUser, "Avatar", "Ha actualizado su foto de perfil", mainGuildId);
            }
        } catch (e) {
            // Silencioso
        }
    },
};
