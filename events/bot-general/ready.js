/**
 * @file ready.js
 * @description Evento 'clientReady'. Se dispara una sola vez cuando el bot inicia sesión correctamente.
 * Se encarga de:
 * 1. Notificar en consola que el bot está online.
 * 2. Verificar/Migrar configuración inicial si se usa un .env legacy para el servidor principal.
 */

const { logError } = require("../../utils/logger");
const { getGuildSettings, updateGuildSettings } = require("../../utils/dataHandler");
const config = require("../../config");

module.exports = {
    name: "clientReady",
    once: true,

    async execute(client) {
        console.log(`✅ ${client.user.tag} está online y operando.`);

        const mainGuildId = config.general.guildId;

        // Lógica de compatibilidad / Migración inicial
        if (mainGuildId) {
            try {
                // Chequear si ya existe config en DB
                const currentSettings = await getGuildSettings(mainGuildId);

                // Si no existe, creamos la primera config usando los valores del archivo config.js (.env)
                if (!currentSettings) {
                    console.log("🚀 Server principal sin config en DB. Migrando valores predeterminados...");
                    await updateGuildSettings(mainGuildId, {
                        logsChannel: config.general.logsChannel,
                        verifyChannel: config.general.verifyChannel,
                        welcomeChannel: config.general.welcomeChannel,
                        supportChannel: config.general.supportScamChannel,
                        roleUser: config.general.roleUser,
                        roleNoVerify: config.general.roleNoVerify,
                        roleMuted: config.general.roleMuted,
                        debugChannel: null // Debug channel por defecto null
                    });
                    console.log("✅ Migración a DB completada.");
                }
            } catch (err) {
                logError(client, err, "Migración Inicial Ready", mainGuildId);
            }
        }
    },
};