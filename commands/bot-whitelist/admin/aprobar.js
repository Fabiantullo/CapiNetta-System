/**
 * @file aprobar.js
 * @description Comando de Whitelist. 
 * Aprueba a un usuario, notificando en el canal configurado.
 * 
 * @requires config - Depende de la configuración global para obtener IDs de canales.
 */

const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const config = require("../../../config");
const { prisma } = require("../../../utils/database");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("aprobar")
        .setDescription("Aprobar solicitud de whitelist")
        .addUserOption(option =>
            option.setName("usuario")
                .setDescription("Usuario a aprobar")
                .setRequired(true)
        ),
    async execute(interaction, { sendWhitelistEmbed }) {
        const user = interaction.options.getUser("usuario");

        // El handler injecta 'sendWhitelistEmbed' como helper
        const channel = await interaction.client.channels.fetch(config.whitelist.channelId);

        await sendWhitelistEmbed(channel, user, "aprobada", 0x2ecc71); // Verde

        // LOGGING EN BASE DE DATOS
        try {
            await prisma.whitelistLog.create({
                data: {
                    userId: user.id,
                    userTag: user.tag,
                    moderatorId: interaction.user.id,
                    moderatorTag: interaction.user.tag,
                    action: "aprobado",
                    note: "Aprobado mediante comando /aprobar"
                }
            });
            console.log(`✅ Log de Whitelist guardado para ${user.tag}`);
        } catch (error) {
            console.error("❌ Error guardando log de whitelist:", error);
        }

        await interaction.reply({ content: `✅ Whitelist de **${user.tag}** aprobada.`, flags: [MessageFlags.Ephemeral] });
    },
};
