/**
 * @file eventHandler.js
 * @description Cargador dinámico de Eventos.
 * Lee los archivos de eventos en la carpeta especificada y los asocia a los listeners del cliente.
 * Soporta eventos `once` y `on`.
 * 
 * @param {Client} client - Instancia del cliente Discord.
 * @param {string} subDir - Subdirectorio dentro de 'events' (ej: 'bot-general').
 */

const fs = require('fs');
const path = require('path');

module.exports = (client, subDir) => {
    const eventsPath = path.join(__dirname, '../events', subDir);

    // Filtramos solo archivos .js
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);

        // Registrar el listener
        if (event.once) {
            // Evento de una sola vez (ej: ready)
            client.once(event.name, (...args) => event.execute(client, ...args));
        } else {
            // Evento continuo (ej: interactionCreate)
            client.on(event.name, (...args) => event.execute(client, ...args));
        }
    }
};
