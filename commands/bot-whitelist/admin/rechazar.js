/**
 * @file rechazar.js
 * @description Comando de Whitelist.
 * Rechaza a un usuario y muestra la normativa asociada.
 */

const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const config = require("../../../config");
const { prisma } = require("../../../utils/database");

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

        // LOGGING EN BASE DE DATOS
        try {
            await prisma.whitelistLog.upsert({
                where: { userId_action: { userId: user.id, action: "rechazado" } },
                update: {
                    moderatorId: interaction.user.id,
                    moderatorTag: interaction.user.tag,
                    note: "Rechazado mediante comando /rechazar"
                },
                create: {
                    userId: user.id,
                    userTag: user.tag,
                    moderatorId: interaction.user.id,
                    moderatorTag: interaction.user.tag,
                    action: "rechazado",
                    note: "Rechazado mediante comando /rechazar"
                }
            });
            console.log(`✅ Log de Whitelist guardado para ${user.tag}`);
        } catch (error) {
            console.error("❌ Error guardando log de whitelist:", error);
        }

        await interaction.reply({ content: `❌ Whitelist de **${user.tag}** rechazada.`, flags: [MessageFlags.Ephemeral] });
    },
};
