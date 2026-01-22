const { EmbedBuilder } = require("discord.js");
const config = require("../../config").whitelist; //
const { logError } = require("../../utils/logger");

module.exports = {
    name: "clientReady", // Corregido
    once: true,
    async execute(client) {
        console.log(`✅ Capi Netta RP [Whitelist] está online.`);

        // Aplicamos la misma lógica de pins si tenés un canal de whitelist con mensajes fijados
        const wlChannel = await client.channels.fetch(config.channelId).catch(() => null);
        if (wlChannel) {
            try {
                const pins = await wlChannel.messages.fetchPins();
                const alreadyPinned = pins.map(m => m.author.id).includes(client.user.id);
                // Si necesitás mandar un mensaje inicial aquí, seguí la lógica del archivo anterior
            } catch (err) {
                console.log("No hay mensajes fijados en Whitelist o error de acceso.");
            }
        }
    },
};