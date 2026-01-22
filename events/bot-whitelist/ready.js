const { logError } = require("../../utils/logger");
const config = require("../../config").whitelist;

module.exports = {
    name: "clientReady", // Cambiado para que coincida con el general
    once: true,
    async execute(client) {
        console.log(`✅ ${client.user.tag} [Whitelist] está online.`);

        // Canal de Whitelist - Limpiamos la lógica de pins para que no tire error
        const wlChannel = await client.channels.fetch(config.channelId).catch(() => null);
        if (wlChannel) {
            try {
                const pins = await wlChannel.messages.fetchPins();
                // Simplemente verificamos sin usar funciones complejas
                let hasPin = false;
                pins.forEach(m => { if (m.author.id === client.user.id) hasPin = true; });

                if (!hasPin) {
                    console.log("No hay mensajes fijados del bot en Whitelist.");
                }
            } catch (err) {
                // No hacemos nada si falla, para que el bot no se caiga
            }
        }
    },
};