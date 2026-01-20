const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

module.exports = (client, subDir) => {
    client.commands = new Collection();
    const foldersPath = path.join(__dirname, '../commands', subDir);

    // Check if folder exists
    if (!fs.existsSync(foldersPath)) return;

    const commandFolders = fs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);

        // Ensure it is a directory
        if (!fs.lstatSync(commandsPath).isDirectory()) continue;

        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            } else {
                console.log(`[WARNING] El comando en ${filePath} no tiene "data" o "execute".`);
            }
        }
    }
};
