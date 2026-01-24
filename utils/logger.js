/**
 * @file logger.js
 * @description Sistema central de logs para el bot.
 * Maneja el envío de embeds informativos a canales configurados (DB Logs, Debug, etc).
 * 
 * @module Utils/Logger
 */

const { EmbedBuilder } = require("discord.js");
const config = require("../config").general;

/**
 * Envia un LOG DE ACTIVIDAD GENERAL al canal configurado en el servidor.
 * También guarda el registro en la base de datos `activity_logs`.
 * 
 * @param {import("discord.js").Client} client - Cliente del bot.
 * @param {import("discord.js").User} user - Usuario que realizó la acción.
 * @param {string} text - Descripción de la acción.
 * @param {string} guildId - ID del servidor (obligatorio para logs multiservidor).
 * @param {import("discord.js").Message} [messageToEdit] - Opcional: Si se quiere editar un mensaje existente en vez de enviar uno nuevo.
 */
async function sendLog(client, user, text, guildId, messageToEdit = null) {
    if (!guildId) return;
    const { pool } = require("./database"); // Require on-demand para evitar ciclos
    try {
        // 1. Guardar en DB para historial permanente
        await pool.query(
            'INSERT INTO activity_logs (guildId, userId, action) VALUES (?, ?, ?)',
            [guildId, user.id, text.substring(0, 500)]
        );
    } catch (e) { console.error("Error guardando actividad:", e); }

    try {
        const { getGuildSettings } = require("./dataHandler");
        const settings = await getGuildSettings(guildId);

        // Validar que el servidor tenga configurado el canal de logs
        if (!settings || !settings.logsChannel) return;

        const channel = await client.channels.fetch(settings.logsChannel).catch(() => null);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setDescription(text)
            .setColor(0xf1c40f) // Amarillo
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
 * Envia un LOG DE CAMBIO DE PERFIL (User Updates) al canal configurado.
 * Es una variante de `sendLog` especializada en cambios de campos (Avatar, Username, etc).
 * 
 * @param {import("discord.js").Client} client 
 * @param {import("discord.js").User} user 
 * @param {string} fieldName - Nombre del campo cambiado.
 * @param {string} fieldValue - Valor nuevo.
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
 * Reporta un ERROR TÉCNICO en consola y en el canal de Debug configurado.
 * Útil para catch blocks globales.
 * 
 * @param {import("discord.js").Client} client 
 * @param {Error} error 
 * @param {string} context - Dónde ocurrió el error (ej: "Comando /ticket").
 */
async function logError(client, error, context = "General", guildId = null) {
    console.error(`[${new Date().toISOString()}] ❌ Error en ${context}:`, error);

    if (client && guildId) {
        try {
            const { getGuildSettings } = require("./dataHandler");
            const settings = await getGuildSettings(guildId);
            // Intenta usar canal Debug, si no existe usa el de Logs.
            const channelId = settings?.debugChannel || settings?.logsChannel;

            if (channelId) {
                const channel = await client.channels.fetch(channelId).catch(() => null);
                if (channel) {
                    const embed = new EmbedBuilder()
                        .setTitle(`🚨 Fallo detectado: ${context}`)
                        .setDescription(`\`\`\`js\n${error.stack || error.message || error}\n\`\`\``)
                        .setColor(0xff0000) // Rojo Alerta
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
