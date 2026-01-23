const { REST, Routes } = require('discord.js');
const config = require('./config');

const rest = new REST().setToken(config.general.token);

(async () => {
    try {
        const clientId = Buffer.from(config.general.token.split('.')[0], 'base64').toString();
        const guildId = config.general.guildId;

        if (guildId) {
            console.log(`🧹 Borrando comandos duplicados del servidor: ${guildId}...`);
            await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
            console.log('✅ Comandos locales del servidor eliminados. Ahora solo verás los globales.');
        } else {
            console.log('⚠️ No se encontró GENERAL_GUILD_ID en tu configuración.');
        }
    } catch (error) {
        console.error('❌ Error al limpiar:', error);
    }
})();