require('dotenv').config();

const requiredVars = [
    'GENERAL_TOKEN',
    'GENERAL_GUILD_ID',
    'GENERAL_VERIFY_CHANNEL',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'WHITELIST_TOKEN',
    'GENERAL_CLIENT_ID',
    'GENERAL_CLIENT_SECRET',
    'DASHBOARD_CALLBACK_URL',
    'SESSION_SECRET'
    // Agrega aquí todas las críticas
];

// 2. Buscamos cuáles faltan
const missingVars = requiredVars.filter(key => !process.env[key]);

// 3. Si falta alguna, detenemos el bot INMEDIATAMENTE con un error claro
if (missingVars.length > 0) {
    console.error(`\n❌ ERROR FATAL: Faltan variables en el archivo .env:`);
    console.error(missingVars.join(', '));
    console.error('El bot no puede iniciar sin ellas.\n');
    process.exit(1); // Cierra el proceso
}

module.exports = {
    general: {
        token: process.env.GENERAL_TOKEN,
        guildId: process.env.GENERAL_GUILD_ID,
        verifyChannel: process.env.GENERAL_VERIFY_CHANNEL,
        welcomeChannel: process.env.GENERAL_WELCOME_CHANNEL,
        logsChannel: process.env.GENERAL_LOGS_CHANNEL,
        roleNoVerify: process.env.GENERAL_ROLE_NO_VERIFY,
        roleUser: process.env.GENERAL_ROLE_USER,
        roleMuted: process.env.GENERAL_ROLE_MUTED,
        supportScamChannel: process.env.GENERAL_SUPPORT_SCAM_CHANNEL,
        minAccountDays: 7,
        minVerifyMinutes: 1,
        spamLimit: 5,
        spamInterval: 5000,
        warnTimeoutMinutes: 10
    },
    database: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    },
    whitelist: {
        token: process.env.WHITELIST_TOKEN,
        clientId: process.env.WHITELIST_CLIENT_ID,
        guildId: process.env.WHITELIST_GUILD_ID,
        staffRoleId: process.env.WHITELIST_STAFF_ROLE_ID,
        channelId: process.env.WHITELIST_CHANNEL_ID,
        normativa: "https://bit.ly/4qti5GP"
    },
    dashboard: {
        clientId: process.env.GENERAL_CLIENT_ID,
        clientSecret: process.env.GENERAL_CLIENT_SECRET,
        callbackUrl: process.env.DASHBOARD_CALLBACK_URL,
        sessionSecret: process.env.SESSION_SECRET
    }
};