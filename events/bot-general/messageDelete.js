const { AuditLogEvent, EmbedBuilder } = require("discord.js");
const config = require("../../config").general;
const { logError } = require("../../utils/logger");

module.exports = {
    name: "messageDelete",
    async execute(client, message) {
        if (!message.guild || !message.author || message.author.bot) return;

        let executor = null;
        try {
            // Esperar un momento para que Discord genere el audit log
            await new Promise(resolve => setTimeout(resolve, 2000));

            const logs = await message.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.MessageDelete
            });

            const entry = logs.entries.first();

            // Verificamos si el log es reciente (últimos 5 segundos) y coincide con el canal y autor
            if (entry &&
                entry.target.id === message.author.id &&
                entry.extra.channel.id === message.channel.id &&
                entry.createdTimestamp > (Date.now() - 5000)) {
                executor = entry.executor;
            } else {
                // Si no hay log reciente que coincida, asumimos que fue el propio autor
                executor = message.author;
            }
        } catch (err) {
            logError(client, err, "Fetch Delete Audit Log");
            // En caso de error, mostramos "Desconocido" o el autor como fallback seguro? 
            // Mejor dejar null para que el log diga "Autor / Desconocido" como pusimos abajo, o forzar autor.
            // Dejaremos null para que entre en el ternario de abajo.
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
