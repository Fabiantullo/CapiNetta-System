const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config").general;
const { logError } = require("../../utils/logger");

module.exports = {
    name: "clientReady",
    once: true,
    async execute(client) {
        console.log(`✅ Conectado como ${client.user.tag}`);
        console.log(`📦 [Debug] Comandos cargados en memoria: ${client.commands.size}`);

        const channel = await client.channels.fetch(config.verifyChannel).catch(err => {
            logError(client, err, "Ready - Fetch Verify Channel");
            return null;
        });
        if (!channel) return;

        const messages = await channel.messages.fetch({ limit: 10 });
        const alreadySent = messages.some(
            m => m.author.id === client.user.id && m.components.length
        );
        if (alreadySent) return;

        const embed = new EmbedBuilder()
            .setAuthor({
                name: "Administración | Capi Netta RP"
            })
            .setTitle("Obtén tu verificación")
            .setDescription(
                "¡Bienvenido/a a **Capi Netta RP**!\n\n" +
                "⏱️ Permanecé **1 minuto** en el servidor\n" +
                "📜 Leé y aceptá las normativas\n\n" +
                "Luego presioná el botón ✅"
            )
            .setColor(0x3498db)
            .setTimestamp();


        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("verify")
                .setEmoji("✅")
                .setLabel("Verificarme")
                .setStyle(ButtonStyle.Success)
        );

        await channel.send({ embeds: [embed], components: [row] });
    },
};
