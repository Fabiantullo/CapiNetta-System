const { SlashCommandBuilder } = require("discord.js");
const config = require("../../../config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rechazar")
        .setDescription("Rechazar whitelist a un usuario")
        .addUserOption(option =>
            option.setName("usuario")
                .setDescription("Usuario a rechazar")
                .setRequired(true)
        ),
    async execute(interaction, { sendWhitelistEmbed }) {
        const user = interaction.options.getUser("usuario");
        if (!user) {
            return interaction.reply({ content: "⚠️ Debés seleccionar un usuario.", ephemeral: true });
        }

        const channel = await interaction.client.channels.fetch(config.whitelist.channelId);
        await sendWhitelistEmbed(channel, user, "rechazada", 0xe74c3c, config.whitelist.normativa);
        await interaction.reply({ content: "❌ Whitelist rechazada correctamente.", ephemeral: true });
    },
};
