const { EmbedBuilder } = require("discord.js");
const config = require("../../config").general;
const { logError } = require("../../utils/logger");

module.exports = {
    name: "messageBulkDelete",
    async execute(client, messages) {
        const channel = messages.first()?.channel;
        if (!channel) return;
        const embed = new EmbedBuilder()
            .setTitle("🧹 Borrado masivo")
            .setDescription(`Se eliminaron **${messages.size}** mensajes en <#${channel.id}>`)
            .setColor(0xe74c3c)
            .setTimestamp();
        client.channels.fetch(config.logsChannel).then(ch => ch?.send({ embeds: [embed] })).catch(err => logError(client, err, "BulkDelete Log"));
    },
};
