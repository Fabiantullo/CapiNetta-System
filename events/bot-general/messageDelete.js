/**
 * @file messageDelete.js
 * @description Evento disparado al eliminar un mensaje.
 * Intenta identificar quién borró el mensaje consultando los AuditLogs (con un pequeño delay)
 * y envía el reporte al canal de logs.
 */

const { AuditLogEvent, EmbedBuilder } = require("discord.js");
const { logError } = require("../../utils/logger");
const { getGuildSettings } = require("../../utils/dataHandler");

module.exports = {
    name: "messageDelete",
    async execute(client, message) {
        // Ignorar mensajes parciales o de bots
        if (!message.guild || !message.author || message.author.bot) return;

        const guildId = message.guild.id;
        const settings = await getGuildSettings(guildId);

        if (!settings || !settings.logsChannel) return;

        let executor = null;
        try {
            // Esperar 2s para asegurar que Discord actualice el Audit Log
            await new Promise(resolve => setTimeout(resolve, 2000));

            const logs = await message.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MessageDelete });
            const entry = logs.entries.first();

            // Verificar si la entrada del log coincide con este evento (Target ID, Canal, Tiempo < 5s)
            if (entry && entry.target.id === message.author.id &&
                entry.extra.channel.id === message.channel.id &&
                entry.createdTimestamp > (Date.now() - 5000)) {
                executor = entry.executor;
            } else {
                executor = message.author; // Asumimos auto-borrado si no hay log reciente
            }
        } catch (err) {
            logError(client, err, "Fetch Delete Audit Log", guildId);
        }

        const channel = await client.channels.fetch(settings.logsChannel).catch(() => null);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setDescription(`🗑️ **Mensaje eliminado**\n📍 Canal: <#${message.channel.id}>\n💬 Contenido:\n${message.content || "*Archivo / embed*"}\n👮 Eliminado por: ${executor ? `${executor.tag} (${executor.id})` : "Autor / Desconocido"}`)
            .setColor(0xe67e22) // Naranja
            .setTimestamp();

        channel.send({ embeds: [embed] }).catch(err => logError(client, err, "MessageDelete Log", guildId));
    },
};