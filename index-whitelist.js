const { Client, GatewayIntentBits } = require("discord.js");
const config = require("./config");

// Cliente Whitelist (Secundario)
const clientWhitelist = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        // Agrega más intents si el bot de whitelist necesita leer mensajes o miembros
        // Por defecto Guilds suele bastar para slash commands
    ]
});

const loadEvents = require("./handlers/eventHandler");
const loadCommands = require("./handlers/commandHandler");

// Cargar Handlers solo para Whitelist
loadEvents(clientWhitelist, "bot-whitelist");
loadCommands(clientWhitelist, "bot-whitelist");

// Manejo de Errores
process.on('unhandledRejection', error => console.error('❌ [Whitelist] Unhandled Rejection:', error));
process.on('uncaughtException', error => console.error('❌ [Whitelist] Uncaught Exception:', error));

const { initDB } = require("./utils/database");

(async () => {
    try {
        await initDB();
        await clientWhitelist.login(config.whitelist.token);
        console.log("✅ [Whitelist] Login exitoso.");
    } catch (err) {
        console.error("❌ [Whitelist] Error fatal en inicio:", err);
        process.exit(1);
    }
})();
