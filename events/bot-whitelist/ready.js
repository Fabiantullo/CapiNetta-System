const { EmbedBuilder } = require("discord.js");
const config = require("../../config").whitelist; //
const { logError } = require("../../utils/logger");

module.exports = {
    name: "clientReady", //
    once: true,
    async execute(client) {
        console.log(`✅ ${client.user.tag} está online.`);

        try {
            const wlChannel = await client.channels.fetch(config.channelId).catch(() => null);
            if (wlChannel) {
                const pins = await wlChannel.messages.fetchPins();
                // FIX: Convertimos a Array real para evitar errores de .some
                const pinsArray = [...pins.values()];
                const alreadyPinned = pinsArray.some(m => m.author.id === client.user.id);

                if (!alreadyPinned) {
                    // Si necesitas enviar un mensaje inicial de whitelist, agregalo aquí.
                }
            }
        } catch (err) {
            console.log("No hay mensajes fijados en Whitelist o error de acceso.");
        }
    },
};