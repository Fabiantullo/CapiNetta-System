const { REST, Routes } = require('discord.js');
const config = require('./config'); // Unified config
const fs = require('fs');
const path = require('path');

async function deployForBot(botName, botConfig, commandsSubDir) {
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
            } else {
                console.log(`[WARNING] El comando en ${filePath} no tiene "data" o "execute".`);
            }
        }
    }

    const rest = new REST().setToken(botConfig.token);

    try {
        console.log(`Iniciando actualización de ${commands.length} comandos de aplicación para [${botName}].`);

        // Usamos applicationCommands para global o applicationGuildCommands si fuera específico de guild (más rápido)
        // Aquí asumimos global para General y Guild para Whitelist según config original, pero unificaremos a global si tiene clientId

        let route;
        if (botConfig.guildId) {
            route = Routes.applicationGuildCommands(botConfig.clientId || extractClientId(botConfig.token), botConfig.guildId);
        } else {
            // Si no hay guildId, usamos global (requiere clientId)
            // Nota: Bot General usaba config.clientId pero no vi el valor en config.json original, asumiré que se necesita.
            // Si falta clientId en general, esto fallará.
            // Voy a intentar extraer el ID del token si no está explícito, aunque config.js debería tenerlo.
            // Revisando config.js: general.clientId NO FUE AGREGADO. ERROR POTENCIAL.
            // El config.json original NO tenía clientId.
            // El token base64 decode primera parte es el ID.
            console.log(`⚠️ [${botName}] No se definio Guild ID, intentando despliegue global (esto puede tardar 1h en actualizarse).`);
            const clientId = extractClientId(botConfig.token);
            route = Routes.applicationCommands(clientId);
        }

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
    // Deploy General
    // Nota: Config General original no tenía clientId explícito en config.json, usaremos el extractor.
    await deployForBot("Bot General", config.general, "bot-general");

    // Deploy Whitelist
    await deployForBot("Bot Whitelist", config.whitelist, "bot-whitelist");
})();
