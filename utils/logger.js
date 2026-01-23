const { EmbedBuilder } = require("discord.js");
const config = require("../config").general;

/**
 * Envia un log general al canal configurado
 * @param {import("discord.js").Client} client 
 * @param {import("discord.js").User} user 
 * @param {string} text 
 */
async function sendLog(client, user, text, guildId, messageToEdit = null) {
    if (!guildId) return;

    try {
        const { getGuildSettings } = require("./dataHandler");
        const settings = await getGuildSettings(guildId);

        if (!settings || !settings.logsChannel) return;

        const channel = await client.channels.fetch(settings.logsChannel).catch(() => null);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setDescription(text)
            .setColor(0xf1c40f)
            .setTimestamp();

        if (messageToEdit) {
            return messageToEdit.edit({ embeds: [embed] }).catch(() => null);
        }

        return channel.send({ embeds: [embed] }).catch(() => null);
    } catch (err) {
        console.error("Error en sendLog multiservidor:", err);
    }
}


/**
 * Envia un log de perfil al canal configurado
 * @param {import("discord.js").Client} client 
 * @param {import("discord.js").User} user 
 * @param {string} fieldName 
 * @param {string} fieldValue 
 */
async function sendProfileLog(client, user, fieldName, fieldValue, guildId) {
    if (!guildId) return;
    const { getGuildSettings } = require("./dataHandler");
    const settings = await getGuildSettings(guildId);

    if (!settings || !settings.logsChannel) return;

    const channel = await client.channels.fetch(settings.logsChannel).catch(() => null);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .addFields({ name: fieldName, value: fieldValue })
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setColor(0xf1c40f)
        .setTimestamp();
    channel.send({ embeds: [embed] }).catch(() => { });
}

/**
 * Loguea un error en la consola y opcionalmente en Discord
 * @param {import("discord.js").Client} client 
 * @param {Error} error 
 * @param {string} context 
 */
async function logError(client, error, context = "General", guildId = null) {
    console.error(`[${new Date().toISOString()}] ❌ Error en ${context}:`, error);

    if (client && guildId) {
        try {
            const { getGuildSettings } = require("./dataHandler");
            const settings = await getGuildSettings(guildId);
            const channelId = settings?.debugChannel || settings?.logsChannel;

            if (channelId) {
                const channel = await client.channels.fetch(channelId).catch(() => null);
                if (channel) {
                    const embed = new EmbedBuilder()
                        .setTitle(`🚨 Fallo detectado: ${context}`)
                        .setDescription(`\`\`\`js\n${error.stack || error.message || error}\n\`\`\``)
                        .setColor(0xff0000)
                        .setTimestamp();

                    await channel.send({ embeds: [embed] }).catch(() => { });
                }
            }
        } catch (err) {
            console.error("⚠️ No se pudo enviar el reporte de error a Discord:", err);
        }
    }
}
module.exports = { sendLog, sendProfileLog, logError };
