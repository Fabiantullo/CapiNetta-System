const { AuditLogEvent } = require("discord.js");
const { sendLog, logError } = require("../../utils/logger");

module.exports = {
    name: "guildMemberUpdate",
    async execute(client, oldM, newM) {
        const addedRoles = newM.roles.cache.filter(r => !oldM.roles.cache.has(r.id));
        const removedRoles = oldM.roles.cache.filter(r => !newM.roles.cache.has(r.id));

        if (addedRoles.size === 0 && removedRoles.size === 0) return;

        // Esperar un momento para que Discord actualice los audit logs
        await new Promise(resolve => setTimeout(resolve, 2000));

        const logs = await newM.guild.fetchAuditLogs({ limit: 5, type: AuditLogEvent.MemberRoleUpdate }).catch(err => {
            logError(client, err, "Fetch Role Audit Log");
            return null;
        });

        const logEntry = logs?.entries.find(e => e.target.id === newM.id && e.createdTimestamp > (Date.now() - 5000));
        const executor = logEntry ? logEntry.executor : null;
        const executorText = executor ? `${executor.tag} (${executor.id})` : "Desconocido";

        if (addedRoles.size > 0) {
            const rolesText = addedRoles.map(r => `**${r.name}**`).join(", ");
            sendLog(client, newM.user, `🎭 Roles agregados: ${rolesText} por ${executorText}`);
        }

        if (removedRoles.size > 0) {
            const rolesText = removedRoles.map(r => `**${r.name}**`).join(", ");
            sendLog(client, newM.user, `🎭 Roles removidos: ${rolesText} por ${executorText}`);
        }
    },
};
