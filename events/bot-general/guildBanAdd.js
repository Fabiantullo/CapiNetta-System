/**
 * @file guildBanAdd.js
 * @description Evento disparado cuando un usuario es baneado.
 * Intenta recuperar el administrador que ejecutó el ban desde los Audit Logs
 * y envía un registro al canal de Logs.
 */

const { AuditLogEvent } = require("discord.js");
const { sendLog, logError } = require("../../utils/logger");

module.exports = {
    name: "guildBanAdd",
    async execute(client, ban) {
        // Consultar Audit Logs para saber QUIÉN baneó
        const logs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd }).catch(err => {
            logError(client, err, "Fetch Ban Audit Log");
            return null;
        });

        const executor = logs?.entries.first()?.executor;

        // Enviar Log
        sendLog(client, ban.user, `🔨 **${ban.user.tag}** fue baneado por ${executor ? `${executor.tag} (${executor.id})` : "Desconocido"}`);
    },
};
