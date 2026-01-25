/**
 * @file logger.js
 * @description Sistema de registro de actividad.
 * Envía logs visuales a canal de Discord y los guarda en MariaDB (Prisma) para auditoría.
 */

const { EmbedBuilder } = require('discord.js');
const { getGuildSettings } = require('./dataHandler');

/**
 * Envía un log formateado y lo guarda en DB.
 * @param {Object} client - Cliente de Discord
 * @param {Object} user - Usuario que ejecuta la acción
 * @param {string} text - Descripción del evento
 * @param {string} guildId - ID del servidor
 * @param {Object} messageToEdit - (Opcional) Si es un log de edición de mensaje
 */
async function sendLog(client, user, text, guildId, messageToEdit = null) {
    if (!guildId) return;
    const { prisma } = require("./database"); // Require on-demand

    try {
        // 1. Guardar en DB para historial permanente (Prisma)
        await prisma.activityLog.create({
            data: {
                guildId,
                userId: user.id || 'System',
                action: text
            }
        });

        // 2. Enviar embed a Discord (Visual)
        const settings = await getGuildSettings(guildId);
        if (!settings || !settings.logsChannel) return;

        const channel = await client.channels.fetch(settings.logsChannel).catch(() => null);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setDescription(text)
            .setColor(0x3498db) // Azul genérico
            .setTimestamp()
            .setFooter({ text: `User ID: ${user.id || 'System'}` });

        if (user.avatarURL) {
            embed.setAuthor({ name: user.tag || 'Sistema', iconURL: user.displayAvatarURL() });
        }

        await channel.send({ embeds: [embed] });

    } catch (err) {
        console.error("Error en logger:", err);
    }
}

/**
 * Registra errores críticos del sistema en DB y Consola.
 */
async function logError(client, error, context, guildId = null) {
    const { prisma } = require("./database");
    console.error(`[${context}] Error:`, error);

    try {
        await prisma.systemError.create({
            data: {
                context: context,
                message: error.toString(),
                stack: error.stack
            }
        });
    } catch (dbErr) {
        console.error("Critical: Failed to log error to DB.", dbErr);
    }
}

module.exports = { sendLog, logError };
