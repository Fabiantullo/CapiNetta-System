const { AuditLogEvent, EmbedBuilder } = require("discord.js");
const config = require("../../config").general;
const { logError } = require("../../utils/logger");

module.exports = {
    name: "messageDelete",
    async execute(client, message) {
        if (!message.guild || !message.author || message.author.bot) return;

        let executor = null;
        try {
            const logs = await message.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.MessageDelete
            });
            const entry = logs.entries.first();
            // Discord solo guarda el usuario que borró el mensaje, no el mensaje exacto
            if (entry && entry.target.id === message.author.id) executor = entry.executor;
        } catch (err) {
            logError(client, err, "Fetch Delete Audit Log");
        }

        const channel = await client.channels.fetch(config.logsChannel).catch(() => null);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setDescription(`🗑️ **Mensaje eliminado**\n📍 Canal: <#${message.channel.id}>\n💬 Contenido:\n${message.content || "*Archivo / embed*"}\n👮 Eliminado por: ${executor ? `${executor.tag} (${executor.id})` : "Autor / Desconocido"}`)
            .setColor(0xe67e22)
            .setTimestamp();

        channel.send({ embeds: [embed] }).catch(err => logError(client, err, "MessageDelete Log"));
    },
};
