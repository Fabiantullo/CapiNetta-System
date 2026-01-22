const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config").general;
const { logError } = require("../../utils/logger");

module.exports = {
    name: "clientReady",
    once: true,
    async execute(client) {
        console.log(`✅ Conectado como ${client.user.tag}`);

        // Verificación
        const vChannel = await client.channels.fetch(config.verifyChannel).catch(() => null);
        if (vChannel) {
            const msgs = await vChannel.messages.fetch({ limit: 10 });
            if (!msgs.some(m => m.author.id === client.user.id && m.components.length)) {
                const embed = new EmbedBuilder()
                    .setTitle("Obtén tu verificación")
                    .setDescription("Bienvenido/a a **Capi Netta RP**. Presioná ✅")
                    .setColor(0x3498db);
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("verify").setEmoji("✅").setLabel("Verificarme").setStyle(ButtonStyle.Success)
                );
                await vChannel.send({ embeds: [embed], components: [row] });
            }
        }

        // Soporte (Mensaje fijado)
        const sChannel = await client.channels.fetch(config.supportScamChannel).catch(() => null);
        if (sChannel) {
            const pins = await sChannel.messages.fetchPins();
            if (!pins.some(m => m.author.id === client.user.id)) {
                const embed = new EmbedBuilder()
                    .setTitle("📌 Instrucciones de la 𝐙𝐎𝐍𝐀 𝐌𝐔𝐓𝐄")
                    .setDescription("1️⃣ Cambiá tu contraseña.\n2️⃣ Activá 2FA.\n3️⃣ Avisá al Staff aquí.")
                    .setColor(0xf1c40f);
                const msg = await sChannel.send({ embeds: [embed] });
                await msg.pin().catch(() => { });
            }
        }
    },
};