const { SlashCommandBuilder } = require("discord.js");
const config = require("../../../config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("aprobar")
        .setDescription("Aprobar whitelist a un usuario")
        .addUserOption(option =>
            option.setName("usuario")
                .setDescription("Usuario a aprobar")
                .setRequired(true)
        ),
    async execute(interaction, { sendWhitelistEmbed }) {
        const user = interaction.options.getUser("usuario");
        if (!user) {
            return interaction.reply({ content: "⚠️ Debés seleccionar un usuario.", ephemeral: true });
        }

        const channel = await interaction.client.channels.fetch(config.whitelist.channelId);
        await sendWhitelistEmbed(channel, user, "aprobada", 0x2ecc71);
        await interaction.reply({ content: "✅ Whitelist aprobada correctamente.", ephemeral: true });
    },
};
