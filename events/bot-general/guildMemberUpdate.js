const { AuditLogEvent } = require("discord.js");
const { sendLog, logError } = require("../../utils/logger");

module.exports = {
    name: "guildMemberUpdate",
    async execute(client, oldM, newM) {
        const addedRoles = newM.roles.cache.filter(r => !oldM.roles.cache.has(r.id));
        const removedRoles = oldM.roles.cache.filter(r => !newM.roles.cache.has(r.id));

        const logs = await newM.guild.fetchAuditLogs({ limit: 5, type: AuditLogEvent.MemberRoleUpdate }).catch(err => {
            logError(client, err, "Fetch Role Audit Log");
            return null;
        });
        const executor = logs?.entries.find(e => e.target.id === newM.id)?.executor;

        addedRoles.forEach(r => sendLog(client, newM.user, `🎭 Rol agregado: **${r.name}** por ${executor ? `${executor.tag} (${executor.id})` : "Desconocido"}`));
        removedRoles.forEach(r => sendLog(client, newM.user, `🎭 Rol removido: **${r.name}** por ${executor ? `${executor.tag} (${executor.id})` : "Desconocido"}`));
    },
};
