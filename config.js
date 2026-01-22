// CapiNetta-System/config.js
require('dotenv').config();

module.exports = {
    general: {
        token: process.env.GENERAL_TOKEN,
        guildId: process.env.GENERAL_GUILD_ID,
        verifyChannel: process.env.GENERAL_VERIFY_CHANNEL,
        welcomeChannel: process.env.GENERAL_WELCOME_CHANNEL,
        logsChannel: process.env.GENERAL_LOGS_CHANNEL,
        roleNoVerify: process.env.GENERAL_ROLE_NO_VERIFY,
        roleUser: process.env.GENERAL_ROLE_USER,
        roleMuted: process.env.GENERAL_ROLE_MUTED, //
        supportScamChannel: process.env.GENERAL_SUPPORT_SCAM_CHANNEL, //
        minAccountDays: 7,
        minVerifyMinutes: 1,
        spamLimit: 5
    },
    // ESTA ES LA SECCIÓN QUE FALTA O ESTÁ MAL UBICADA
    database: {
        host: process.env.DB_HOST,
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
    }
};