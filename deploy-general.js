const { REST, Routes } = require('discord.js');
const config = require('./config');
const fs = require('fs');
const path = require('path');

const BOT_NAME = "Bot General";
const COMMANDS_DIR = "bot-general";
const IS_GLOBAL = true; // El bot general usa deploy global

async function deploy() {
    const commands = [];
    const foldersPath = path.join(__dirname, 'commands', COMMANDS_DIR);

    if (!fs.existsSync(foldersPath)) {
        console.error(`⚠️ No se encontró la carpeta de comandos: ${foldersPath}`);
        return;
    }

    // Leemos las carpetas de categorías (ej: admin, moderation)
    const commandFolders = fs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);

        // Verificamos si es directorio
        if (fs.lstatSync(commandsPath).isDirectory()) {
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const filePath = path.join(commandsPath, file);
                try {
                    const command = require(filePath);
                    if ('data' in command && 'execute' in command) {
                        commands.push(command.data.toJSON());
                    } else {
                        console.warn(`[WARNING] El comando en ${filePath} le falta la propiedad 'data' o 'execute'.`);
                    }
                } catch (e) {
                    console.error(`[ERROR] Falló la carga de ${file}:`, e);
                }
            }
        }
    }

    const rest = new REST().setToken(config.general.token);
    const clientId = config.general.clientId || extractClientId(config.general.token);

    try {
        console.log(`🚀 Iniciando actualización de ${commands.length} comandos para [${BOT_NAME}]...`);

        // Si es global, usamos applicationCommands
        const route = Routes.applicationCommands(clientId);

        await rest.put(route, { body: commands });

        console.log(`✅ Comandos de [${BOT_NAME}] cargados exitosamente.`);
    } catch (error) {
        console.error(`❌ Error desplegando comandos para [${BOT_NAME}]:`, error);
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

deploy();
