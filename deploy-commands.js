const { REST, Routes } = require('discord.js');
const config = require('./config'); //
const fs = require('fs');
const path = require('path');

/**
 * Registra los comandos para un bot específico
 * @param {string} botName Nombre descriptivo del bot
 * @param {object} botConfig Configuración del bot (token, guildId, etc.)
 * @param {string} commandsSubDir Carpeta de comandos (bot-general o bot-whitelist)
 * @param {boolean} isGlobal Si el despliegue debe ser global o por servidor
 */
async function deployForBot(botName, botConfig, commandsSubDir, isGlobal = false) {
    const commands = [];
    const foldersPath = path.join(__dirname, 'commands', commandsSubDir);

    if (!fs.existsSync(foldersPath)) {
        console.log(`⚠️ No se encontró la carpeta de comandos para ${botName} (${foldersPath})`);
        return;
    }

    const commandFolders = fs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        if (!fs.lstatSync(commandsPath).isDirectory()) continue;

        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
            }
        }
    }

    const rest = new REST().setToken(botConfig.token);
    const clientId = botConfig.clientId || extractClientId(botConfig.token);

    try {
        // --- 1. LIMPIEZA AUTOMÁTICA DE DUPLICADOS ---
        // Si el bot va a ser GLOBAL y tiene un GuildID en la config, borramos primero los comandos locales
        if (isGlobal && botConfig.guildId) {
            console.log(`🧹 [${botName}] Detectado Guild ID en config. Limpiando comandos locales para evitar duplicados...`);
            await rest.put(Routes.applicationGuildCommands(clientId, botConfig.guildId), { body: [] });
            console.log(`✅ Comandos locales del servidor ${botConfig.guildId} eliminados.`);
        }

        // --- 2. REGISTRO DE COMANDOS ---
        const route = isGlobal
            ? Routes.applicationCommands(clientId)
            : Routes.applicationGuildCommands(clientId, botConfig.guildId);

        console.log(`🚀 Iniciando actualización de ${commands.length} comandos para [${botName}] (${isGlobal ? 'GLOBAL' : 'LOCAL'})...`);

        await rest.put(route, { body: commands });

        console.log(`✅ Comandos de [${botName}] cargados exitosamente.`);
    } catch (error) {
        console.error(`❌ Error desplegando comandos para [${botName}]:`, error);
    }
}

function extractClientId(token) {
    try {
        const idBase64 = token.split('.')[0];
        return Buffer.from(idBase64, 'base64').toString('utf-8');
    } catch (e) {
        return null;
    }
}

(async () => {
    // 1. Bot General: Despliegue GLOBAL (limpia automáticamente el GuildID del config para evitar el bug visual)
    await deployForBot("Bot General", config.general, "bot-general", true);

    // 2. Bot Whitelist: Despliegue LOCAL (Guild) para mayor rapidez en el servidor de Whitelist
    await deployForBot("Bot Whitelist", config.whitelist, "bot-whitelist", false);
})();