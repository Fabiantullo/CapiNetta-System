const { sendLog } = require("../../utils/logger");

module.exports = {
    name: "voiceStateUpdate",
    async execute(client, oldS, newS) {
        const user = newS.member.user;
        if (!oldS.channel && newS.channel) sendLog(client, user, `🔊 Entró a voz: **${newS.channel.name}**`);
        if (oldS.channel && !newS.channel) sendLog(client, user, `🔈 Salió de voz: **${oldS.channel.name}**`);
    },
};
