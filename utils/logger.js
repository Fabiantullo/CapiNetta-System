const { EmbedBuilder } = require("discord.js");
const config = require("../config");

/**
 * Envia un log general al canal configurado
 * @param {import("discord.js").Client} client 
 * @param {import("discord.js").User} user 
 * @param {string} text 
 */
async function sendLog(client, user, text) {
    const channel = await client.channels.fetch(config.logsChannel).catch(() => null);
    if (!channel) return;
    const embed = new EmbedBuilder()
        .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setDescription(text)
        .setColor(0xf1c40f)
        .setTimestamp();
    channel.send({ embeds: [embed] }).catch(err => logError(client, err, "Send Log"));
}

/**
 * Envia un log de perfil al canal configurado
 * @param {import("discord.js").Client} client 
 * @param {import("discord.js").User} user 
 * @param {string} fieldName 
 * @param {string} fieldValue 
 */
async function sendProfileLog(client, user, fieldName, fieldValue) {
    const channel = await client.channels.fetch(config.logsChannel).catch(() => null);
    if (!channel) return;
    const embed = new EmbedBuilder()
        .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .addFields({ name: fieldName, value: fieldValue })
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setColor(0xf1c40f)
        .setTimestamp();
    channel.send({ embeds: [embed] }).catch(err => logError(client, err, "Send Profile Log"));
}

/**
 * Loguea un error en la consola y opcionalmente en Discord
 * @param {import("discord.js").Client} client 
 * @param {Error} error 
 * @param {string} context 
 */
function logError(client, error, context = "General") {
    console.error(`[${new Date().toISOString()}] ❌ Error en ${context}:`, error);
    // Aquí podrías agregar lógica para enviar el error a un canal de admins si quisieras
}

module.exports = { sendLog, sendProfileLog, logError };
