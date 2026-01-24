/**
 * @file rechazar.js
 * @description Comando de Whitelist.
 * Rechaza a un usuario y muestra la normativa asociada.
 */

const { SlashCommandBuilder } = require("discord.js");
const config = require("../../../config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rechazar")
        .setDescription("Rechazar solicitud de whitelist")
        .addUserOption(option =>
            option.setName("usuario")
                .setDescription("Usuario a rechazar")
                .setRequired(true)
        ),
    async execute(interaction, { sendWhitelistEmbed }) {
        const user = interaction.options.getUser("usuario");

        const channel = await interaction.client.channels.fetch(config.whitelist.channelId);

        // Enviar Embed Rojo con link a normativa
        await sendWhitelistEmbed(channel, user, "rechazada", 0xe74c3c, config.whitelist.normativa);

        await interaction.reply({ content: `❌ Whitelist de **${user.tag}** rechazada.`, ephemeral: true });
    },
};
