const { logError } = require("../../utils/logger");
const { getGuildSettings, updateGuildSettings } = require("../../utils/dataHandler");
const config = require("../../config");

module.exports = {
    name: "clientReady",
    once: true,
    async execute(client) {
        console.log(`✅ ${client.user.tag} está online y operando.`);

        const mainGuildId = config.general.guildId;
        if (mainGuildId) {
            try {
                const currentSettings = await getGuildSettings(mainGuildId);
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
                        debug: null
                    });
                    console.log("✅ Migración de producción completada con éxito.");
                }
            } catch (err) {
                logError(client, err, "Migración Inicial Ready", mainGuildId);
            }
        }
    },
};