const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("set-verify")
        .setDescription("Envía el mensaje con el botón de verificación en este canal")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
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

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("verify")
                .setEmoji("✅")
                .setLabel("Verificarme")
                .setStyle(ButtonStyle.Success)
        );

        // Intentamos enviar el mensaje al canal donde se usó el comando
        await interaction.channel.send({ embeds: [verifyEmbed], components: [row] });

        // Respondemos solo a vos para confirmar
        await interaction.reply({ content: "✅ Sistema de verificación enviado.", ephemeral: true });
    },
};