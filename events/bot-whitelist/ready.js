const { EmbedBuilder } = require("discord.js");
const config = require("../../config").whitelist; //
const { logError } = require("../../utils/logger");

module.exports = {
    name: "clientReady", // Cambiado para evitar el warning
    once: true,
    async execute(client) {
        console.log(`✅ ${client.user.tag} [Whitelist] está online.`);

        const wlChannel = await client.channels.fetch(config.channelId).catch(() => null);
        if (wlChannel) {
            try {
                const pins = await wlChannel.messages.fetchPins();
                // Usamos directamente .some() de la colección de Discord
                const alreadyPinned = pins.some(m => m.author.id === client.user.id);

                if (!alreadyPinned) {
                    // Si necesitás un mensaje inicial de Whitelist, agregalo aquí.
                    console.log("No hay mensajes fijados en el canal de Whitelist.");
                }
            } catch (err) {
                logError(client, err, "Whitelist Ready Pins");
            }
        }
    },
};