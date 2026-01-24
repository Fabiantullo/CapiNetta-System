/**
 * @file messageUpdate.js
 * @description Evento disparado al editar un mensaje.
 * Registra el cambio (Antes vs Después) en el canal de logs.
 */

const { sendLog } = require("../../utils/logger");

module.exports = {
    name: "messageUpdate",
    async execute(client, oldMsg, newMsg) {
        // Ignorar bots o mensajes sin cachear (oldMsg.author undefined)
        if (!oldMsg.author || oldMsg.author.bot || !oldMsg.guild) return;

        // Ignorar si el contenido no cambió (ej: cambios de embed)
        if (oldMsg.content === newMsg.content) return;

        // Registrar en logs
        sendLog(client, oldMsg.author,
            `📝 **${oldMsg.author.tag}** editó un mensaje en <#${oldMsg.channel.id}>:\n**Antes:** ${oldMsg.content || "Vacío"}\n**Después:** ${newMsg.content || "Vacío"}`,
            oldMsg.guild.id
        );
    },
};