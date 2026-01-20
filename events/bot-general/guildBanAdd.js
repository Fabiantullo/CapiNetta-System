const { AuditLogEvent } = require("discord.js");
const { sendLog, logError } = require("../../utils/logger");

module.exports = {
    name: "guildBanAdd",
    async execute(client, ban) {
        const logs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd }).catch(err => {
            logError(client, err, "Fetch Ban Audit Log");
            return null;
        });
        const executor = logs?.entries.first()?.executor;
        sendLog(client, ban.user, `🔨 **${ban.user.tag}** fue baneado por ${executor ? `${executor.tag} (${executor.id})` : "Desconocido"}`);
    },
};
