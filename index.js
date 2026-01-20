const {
  Client,
  GatewayIntentBits,
  Partials
} = require("discord.js");

const config = require("./config");
const { getWarnsMap } = require("./utils/dataHandler");

/* =======================
   CLIENTE GENERAL
======================= */
const clientGeneral = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.GuildMember,
    Partials.User
  ]
});

// Mapas globales para General
clientGeneral.consecutiveMap = new Map();
clientGeneral.timeoutMap = new Map();
clientGeneral.warnMap = getWarnsMap(); // Cargar desde persistencia

// Limpieza de warns (General)
setInterval(() => {
  clientGeneral.warnMap.clear();
}, 60 * 60 * 1000);

/* =======================
   CLIENTE WHITELIST
======================= */
const clientWhitelist = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* =======================
   HANDLERS DE ERRORES GLOBALES
======================= */
process.on('unhandledRejection', error => {
  console.error('❌ Unhandled Rejection:', error);
});

process.on('uncaughtException', error => {
  console.error('❌ Uncaught Exception:', error);
});

/* =======================
   CARGA DE HANDLERS
======================= */
const loadEvents = require("./handlers/eventHandler");
const loadCommands = require("./handlers/commandHandler");

// Bot General
loadEvents(clientGeneral, "bot-general");
loadCommands(clientGeneral, "bot-general");

// Bot Whitelist
loadEvents(clientWhitelist, "bot-whitelist");
loadCommands(clientWhitelist, "bot-whitelist");

/* =======================
   LOGIN
======================= */
(async () => {
  try {
    await clientGeneral.login(config.general.token);
    console.log("✅ [General] Login exitoso.");
  } catch (err) {
    console.error("❌ [General] Error al iniciar sesión:", err);
  }

  try {
    await clientWhitelist.login(config.whitelist.token);
    console.log("✅ [Whitelist] Login exitoso.");
  } catch (err) {
    console.error("❌ [Whitelist] Error al iniciar sesión:", err);
  }
})();
