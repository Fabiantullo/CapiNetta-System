const { REST, Routes } = require('discord.js');
const config = require('./config');

const rest = new REST().setToken(config.general.token);

(async () => {
    try {
        console.log('🧹 Iniciando limpieza de comandos globales...');

        // Extraemos el ID del bot desde el token
        const clientId = Buffer.from(config.general.token.split('.')[0], 'base64').toString();

        // Enviamos una lista VACÍA ([]) a la ruta global
        await rest.put(Routes.applicationCommands(clientId), { body: [] });

        console.log('✅ Comandos globales eliminados. Ahora solo quedarán los de /setup.');
    } catch (error) {
        console.error('❌ Error al limpiar:', error);
    }
})();