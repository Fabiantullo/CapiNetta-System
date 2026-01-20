const { sendLog } = require("../../utils/logger");

module.exports = {
    name: "messageUpdate",
    async execute(client, oldMsg, newMsg) {
        if (!oldMsg.author || oldMsg.author.bot) return;
        if (oldMsg.content === newMsg.content) return;
        sendLog(client, oldMsg.author, `📝 **${oldMsg.author.tag}** editó un mensaje:\n**Antes:** ${oldMsg.content || "Vacío"}\n**Después:** ${newMsg.content || "Vacío"}`);
    },
};
