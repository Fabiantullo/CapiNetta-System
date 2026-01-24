/**
 * @file voiceStateUpdate.js
 * @description Evento de estado de voz.
 * Registra entradas y salidas de canales de voz en los logs.
 */

const { sendLog } = require("../../utils/logger");

module.exports = {
    name: "voiceStateUpdate",
    async execute(client, oldS, newS) {
        const user = newS.member.user;
        const guildId = newS.guild.id || oldS.guild.id;

        // Entrar a canal
        if (!oldS.channel && newS.channel) {
            sendLog(client, user, `🔊 Entró a voz: **${newS.channel.name}**`, guildId);
        }

        // Salir de canal
        if (oldS.channel && !newS.channel) {
            sendLog(client, user, `🔈 Salió de voz: **${oldS.channel.name}**`, guildId);
        }

        // Cambio de canal (Switch)
        if (oldS.channel && newS.channel && oldS.channelId !== newS.channelId) {
            sendLog(client, user, `➡️ Cambió de canal: **${oldS.channel.name}** → **${newS.channel.name}**`, guildId);
        }
    },
};