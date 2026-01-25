const { Client, GatewayIntentBits, Partials } = require("discord.js");
const config = require("./config");
const { getWarnsFromDB } = require("./utils/dataHandler");
const startDashboard = require('./web/dashboard');

const clientGeneral = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User]
});

clientGeneral.consecutiveMap = new Map();
clientGeneral.warnMap = new Map();

const clientWhitelist = new Client({ intents: [GatewayIntentBits.Guilds] });

const loadEvents = require("./handlers/eventHandler");
const loadCommands = require("./handlers/commandHandler");

loadEvents(clientGeneral, "bot-general");
loadCommands(clientGeneral, "bot-general");
loadEvents(clientWhitelist, "bot-whitelist");
loadCommands(clientWhitelist, "bot-whitelist");

process.on('unhandledRejection', error => console.error('❌ Unhandled Rejection:', error));
process.on('uncaughtException', error => console.error('❌ Uncaught Exception:', error));

(async () => {
  try {
    clientGeneral.warnMap = await getWarnsFromDB();
    console.log("✅ [General] Warns cargados desde Base de Datos.");
    startDashboard();
    await clientGeneral.login(config.general.token);
    console.log("✅ [General] Login exitoso.");
    await clientWhitelist.login(config.whitelist.token);
    console.log("✅ [Whitelist] Login exitoso.");
  } catch (err) {
    console.error("❌ Error en el inicio:", err);
  }
})();