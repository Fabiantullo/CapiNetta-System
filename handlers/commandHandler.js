/**
 * @file commandHandler.js
 * @description Cargador dinámico de Comandos.
 * Lee recursivamente los archivos de comandos en la carpeta especificada
 * y los registra en la colección `client.commands`.
 * 
 * @param {Client} client - Instancia del cliente Discord.
 * @param {string} subDir - Subdirectorio dentro de 'commands' (ej: 'bot-general').
 */

const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

module.exports = (client, subDir) => {
    // Inicializar colección de comandos
    client.commands = new Collection();

    // Ruta base: ../commands/{subDir}
    const foldersPath = path.join(__dirname, '../commands', subDir);

    // Verificar existencia del directorio
    if (!fs.existsSync(foldersPath)) return;

    const commandFolders = fs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);

        // Asegurar que sea una carpeta (categoría de comandos)
        if (!fs.lstatSync(commandsPath).isDirectory()) continue;

        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);

            // Validar estructura del comando (SlashCommandBuilder .data y función .execute)
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            } else {
                console.log(`[WARNING] El archivo ${filePath} no es un comando válido (Falta data o execute).`);
            }
        }
    }
};
