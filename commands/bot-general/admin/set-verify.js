/**
 * @file set-verify.js
 * @description Comando para establecer la "Zona de Verificación".
 * Envía un Embed estético con un botón de verificación integrado.
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("set-verify")
        .setDescription("Envía el mensaje con el botón de verificación en este canal")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Embed de instrucciones
        const verifyEmbed = new EmbedBuilder()
            .setAuthor({ name: "Administración | Capi Netta RP" })
            .setTitle("Obtén tu verificación")
            .setDescription(
                "¡Bienvenido/a a **Capi Netta RP**!\n\n" +
                "⏱️ Permanecé **1 minuto** en el servidor\n" +
                "📜 Leé y aceptá las normativas\n\n" +
                "Luego presioná el botón ✅"
            )
            .setColor(0x3498db);

        // Botón Interactivo (trigger: 'verify')
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("verify")
                .setEmoji("✅")
                .setLabel("Verificarme")
                .setStyle(ButtonStyle.Success)
        );

        // Enviar al canal actual
        await interaction.channel.send({ embeds: [verifyEmbed], components: [row] });

        // Confirmación oculta
        await interaction.reply({ content: "✅ Sistema de verificación enviado.", flags: [MessageFlags.Ephemeral] });
    },
};