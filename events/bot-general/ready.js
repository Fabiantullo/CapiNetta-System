const { logError } = require("../../utils/logger");
const { getGuildSettings, updateGuildSettings } = require("../../utils/dataHandler");
const config = require("../../config");

module.exports = {
    name: "clientReady", // Nombre actualizado para evitar el DeprecationWarning
    once: true,
    async execute(client) {
        console.log(`✅ ${client.user.tag} está online y operando.`);

        // --- 1. SCRIPT DE MIGRACIÓN AUTOMÁTICA ---
        // Esto asegura que tu servidor actual no pierda la configuración al pasar a la DB
        const mainGuildId = config.general.guildId; // ID de tu servidor actual

        if (mainGuildId) {
            try {
                const currentSettings = await getGuildSettings(mainGuildId);

                // Si no existe configuración en la DB para tu server principal, la migramos desde el .env
                if (!currentSettings) {
                    console.log("🚀 Detectado servidor principal sin configuración. Migrando datos del .env...");
                    await updateGuildSettings(mainGuildId, {
                        logs: config.general.logsChannel,
                        verify: config.general.verifyChannel,
                        welcome: config.general.welcomeChannel,
                        support: config.general.supportScamChannel,
                        rUser: config.general.roleUser,
                        rNoVerify: config.general.roleNoVerify,
                        rMuted: config.general.roleMuted,
                        debug: null // El canal de errores lo configurarás luego con /setup
                    });
                    console.log("✅ Migración de producción completada con éxito.");
                }
            } catch (err) {
                // Usamos logError con el client y el ID del server para que te avise si falla la migración
                logError(client, err, "Migración Inicial Ready", mainGuildId);
            }
        }

        // --- 2. NOTA SOBRE VERIFICACIÓN ---
        // Ya no enviamos el mensaje de verificación aquí. 
        // Ahora tenés el control total con el comando /set-verify.
    },
};