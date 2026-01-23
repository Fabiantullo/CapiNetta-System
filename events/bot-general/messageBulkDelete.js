const { EmbedBuilder } = require("discord.js");
const { logError } = require("../../utils/logger");
const { getGuildSettings } = require("../../utils/dataHandler");

module.exports = {
    name: "messageBulkDelete",
    async execute(client, messages) {
        const channel = messages.first()?.channel;
        if (!channel || !channel.guild) return;

        const guildId = channel.guild.id;
        const settings = await getGuildSettings(guildId); //
        if (!settings || !settings.logsChannel) return;

        const embed = new EmbedBuilder()
            .setTitle("🧹 Borrado masivo")
            .setDescription(`Se eliminaron **${messages.size}** mensajes en <#${channel.id}>`)
            .setColor(0xe74c3c)
            .setTimestamp();

        client.channels.fetch(settings.logsChannel)
            .then(ch => ch?.send({ embeds: [embed] }))
            .catch(err => logError(client, err, "BulkDelete Log", guildId));
    },
};