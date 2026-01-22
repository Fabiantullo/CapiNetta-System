const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config").general;
const { logError } = require("../../utils/logger");

module.exports = {
    name: "clientReady",
    once: true,
    async execute(client) {
        console.log(`✅ Conectado como ${client.user.tag}`);

        // Botón Verificación
        const vChannel = await client.channels.fetch(config.verifyChannel).catch(() => null);
        if (vChannel) {
            const msgs = await vChannel.messages.fetch({ limit: 10 });
            if (!msgs.some(m => m.author.id === client.user.id && m.components.length)) {
                const embed = new EmbedBuilder()
                    .setTitle("Obtén tu verificación")
                    .setDescription("Bienvenido/a a **Capi Netta RP**.\n\n⏱️ Permanecé **1 minuto**\n📜 Leé las normas\n\nPresioná ✅")
                    .setColor(0x3498db);
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("verify").setEmoji("✅").setLabel("Verificarme").setStyle(ButtonStyle.Success)
                );
                await vChannel.send({ embeds: [embed], components: [row] });
            }
        }

        // Instrucciones de la Zona Mute
        const sChannel = await client.channels.fetch(config.supportScamChannel).catch(() => null);
        if (sChannel) {
            const pins = await sChannel.messages.fetchPins();
            if (!pins.some(m => m.author.id === client.user.id)) {
                const infoEmbed = new EmbedBuilder()
                    .setTitle("📌 Instrucciones de la 𝐙𝐎𝐍𝐀 𝐌𝐔𝐓𝐄")
                    .setDescription("Si estás acá, tu cuenta fue aislada por seguridad.\n\n1️⃣ **Cambiá tu contraseña.**\n2️⃣ **Activá el 2FA.**\n3️⃣ **Avisá al Staff** por este canal para recuperar tus roles.")
                    .setColor(0xf1c40f);
                const msg = await sChannel.send({ embeds: [infoEmbed] });
                await msg.pin().catch(() => { });
            }
        }
    },
};