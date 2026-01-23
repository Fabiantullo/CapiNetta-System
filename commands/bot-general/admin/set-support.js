const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("set-support")
        .setDescription("Envía y fija las instrucciones en el canal de soporte")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const supportEmbed = new EmbedBuilder()
            .setTitle("🔒 Área de Aislamiento Preventivo")
            .setDescription(
                "Tu cuenta ha sido restringida automáticamente por detectar actividad sospechosa (spam o menciones masivas).\n\n" +
                "**¿Qué tenés que hacer ahora?**\n" +
                "1. Esperá a que un miembro del Staff revise tu caso.\n" +
                "2. No intentes salir y entrar del servidor, o se te aplicará una sanción mayor.\n" +
                "3. Tené paciencia, el proceso de revisión puede demorar."
            )
            .setColor(0xe67e22)
            .setFooter({ text: "Seguridad | Capi Netta RP" });

        const message = await interaction.channel.send({ embeds: [supportEmbed] });
        await message.pin(); // El bot fija el mensaje automáticamente

        await interaction.reply({ content: "✅ Mensaje de soporte enviado y fijado.", ephemeral: true });
    },
};