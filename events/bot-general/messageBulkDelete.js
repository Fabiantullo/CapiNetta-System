/**
 * @file messageBulkDelete.js
 * @description Evento disparado cuando se eliminan mensajes en masa (Bulk Delete).
 * Genera un reporte resumido en el canal de Logs.
 */

const { EmbedBuilder } = require("discord.js");
const { logError } = require("../../utils/logger");
const { getGuildSettings } = require("../../utils/dataHandler");

module.exports = {
    name: "messageBulkDelete",
    async execute(client, messages) {
        // Obtener contexto del canal y servidor
        const channel = messages.first()?.channel;
        if (!channel || !channel.guild) return;

        const guildId = channel.guild.id;
        const settings = await getGuildSettings(guildId);
        if (!settings || !settings.logsChannel) return;

        // Crear Embed de Reporte
        const embed = new EmbedBuilder()
            .setTitle("🧹 Borrado masivo detectado")
            .setDescription(`Se eliminaron **${messages.size}** mensajes en <#${channel.id}>`)
            .setColor(0xe74c3c) // Rojo
            .setTimestamp();

        // Enviar al canal de logs
        client.channels.fetch(settings.logsChannel)
            .then(ch => ch?.send({ embeds: [embed] }))
            .catch(err => logError(client, err, "BulkDelete Log", guildId));
    },
};