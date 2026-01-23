const { sendLog } = require("../../utils/logger");

module.exports = {
    name: "messageUpdate",
    async execute(client, oldMsg, newMsg) {
        if (!oldMsg.author || oldMsg.author.bot || !oldMsg.guild) return;
        if (oldMsg.content === newMsg.content) return;

        // Ajuste: Pasamos el guildId para que busque el canal en MariaDB
        sendLog(client, oldMsg.author,
            `📝 **${oldMsg.author.tag}** editó un mensaje:\n**Antes:** ${oldMsg.content || "Vacío"}\n**Después:** ${newMsg.content || "Vacío"}`,
            oldMsg.guild.id
        );
    },
};