const { AuditLogEvent, EmbedBuilder } = require("discord.js");
const { logError } = require("../../utils/logger");
const { getGuildSettings } = require("../../utils/dataHandler");

module.exports = {
    name: "messageDelete",
    async execute(client, message) {
        if (!message.guild || !message.author || message.author.bot) return;

        const guildId = message.guild.id;
        const settings = await getGuildSettings(guildId); //
        if (!settings || !settings.logsChannel) return;

        let executor = null;
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const logs = await message.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MessageDelete });
            const entry = logs.entries.first();

            if (entry && entry.target.id === message.author.id &&
                entry.extra.channel.id === message.channel.id &&
                entry.createdTimestamp > (Date.now() - 5000)) {
                executor = entry.executor;
            } else {
                executor = message.author;
            }
        } catch (err) {
            logError(client, err, "Fetch Delete Audit Log", guildId);
        }

        const channel = await client.channels.fetch(settings.logsChannel).catch(() => null);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setDescription(`🗑️ **Mensaje eliminado**\n📍 Canal: <#${message.channel.id}>\n💬 Contenido:\n${message.content || "*Archivo / embed*"}\n👮 Eliminado por: ${executor ? `${executor.tag} (${executor.id})` : "Autor / Desconocido"}`)
            .setColor(0xe67e22)
            .setTimestamp();

        channel.send({ embeds: [embed] }).catch(err => logError(client, err, "MessageDelete Log", guildId));
    },
};