/**
 * @file ready.js
 * @description Evento de incialización del bot de Whitelist.
 * Verifica conexión y existencia del canal configurado.
 */

const config = require("../../config").whitelist;

module.exports = {
    name: "clientReady",
    once: true,
    async execute(client) {
        console.log(`✅ ${client.user.tag} [Whitelist] está online.`);

        // Verificación básica del canal de Whitelist para prevenir errores de configuración
        const wlChannel = await client.channels.fetch(config.channelId).catch(() => null);

        if (!wlChannel) {
            console.warn(`⚠️ ALERTA: No se pudo acceder al canal de Whitelist (ID: ${config.channelId}). Revisá la config.`);
        } else {
            // (Opcional) Lógica de verificación de pines o mensajes de bienvenida
            try {
                const pins = await wlChannel.messages.fetchPins();
                const hasPin = pins.some(m => m.author.id === client.user.id);
                if (!hasPin) {
                    console.log("ℹ️ No detecté mensajes fijados del bot en el canal de Whitelist.");
                }
            } catch (err) {
                // Silencioso
            }
        }
    },
};