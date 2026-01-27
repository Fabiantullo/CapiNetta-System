const { REST, Routes } = require('discord.js');
const config = require('./config');
const fs = require('fs');
const path = require('path');

const BOT_NAME = "Bot Whitelist";
const COMMANDS_DIR = "bot-whitelist";
// Whitelist suele ser local para actualizar rápido y no requiere verificación global
const IS_GLOBAL = false;

async function deploy() {
    const commands = [];
    const foldersPath = path.join(__dirname, 'commands', COMMANDS_DIR);

    if (!fs.existsSync(foldersPath)) {
        console.error(`⚠️ No se encontró la carpeta de comandos: ${foldersPath}`);
        return;
    }

    // Leemos las carpetas de categorías
    const commandFolders = fs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);

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

    const rest = new REST().setToken(config.whitelist.token);
    const clientId = config.whitelist.clientId || extractClientId(config.whitelist.token);
    const guildId = config.whitelist.guildId;

    try {
        console.log(`🚀 Iniciando actualización de ${commands.length} comandos para [${BOT_NAME}]...`);

        let route;
        if (IS_GLOBAL) {
            route = Routes.applicationCommands(clientId);
        } else {
            if (!guildId) {
                console.warn(`⚠️ No se definió WHITELIST_GUILD_ID en env. Usando modo Global (puede tardar en actualizar).`);
                route = Routes.applicationCommands(clientId);
            } else {
                route = Routes.applicationGuildCommands(clientId, guildId);
            }
        }

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
