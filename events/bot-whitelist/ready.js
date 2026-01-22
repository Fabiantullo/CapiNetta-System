const { EmbedBuilder } = require("discord.js");
const config = require("../../config").whitelist;
const { logError } = require("../../utils/logger");

module.exports = {
    name: "clientReady", // Cambiado de ready
    once: true,
    async execute(client) {
        console.log(`✅ Capi Netta RP [Whitelist] está online.`);

        // Canal de Whitelist (si tenés lógica de pins acá también)
        const channel = await client.channels.fetch(config.channelId).catch(() => null);
        if (channel) {
            const pins = await channel.messages.fetchPins();

            // Aplicamos el mismo fix para evitar el error pins.some
            const pinsArray = Array.from(pins.values());
            const alreadyPinned = pinsArray.some(m => m.author.id === client.user.id);

            if (!alreadyPinned) {
                // Aquí va el embed que tenías originalmente en tu bot de whitelist
                // Si no mandabas nada, podés dejar esta parte vacía.
            }
        }
    },
};