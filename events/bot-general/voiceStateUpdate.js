const { sendLog } = require("../../utils/logger");

module.exports = {
    name: "voiceStateUpdate",
    async execute(client, oldS, newS) {
        const user = newS.member.user;
        const guildId = newS.guild.id || oldS.guild.id;

        // Ajuste: Pasamos guildId a cada sendLog
        if (!oldS.channel && newS.channel) {
            sendLog(client, user, `🔊 Entró a voz: **${newS.channel.name}**`, guildId);
        }

        if (oldS.channel && !newS.channel) {
            sendLog(client, user, `🔈 Salió de voz: **${oldS.channel.name}**`, guildId);
        }
    },
};