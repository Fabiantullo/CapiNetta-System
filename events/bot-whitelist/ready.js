const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config").general; //
const { logError } = require("../../utils/logger");

module.exports = {
    name: "ready",
    once: true,
    async execute(client) {
        console.log(`✅ ${client.user.tag} está online.`);

        // --- 1. Mensaje de Verificación ---
        const vChannel = await client.channels.fetch(config.verifyChannel).catch(() => null);
        if (vChannel) {
            const msgs = await vChannel.messages.fetch({ limit: 10 });
            // Verificamos si ya existe el mensaje con el botón para no duplicarlo
            if (!msgs.some(m => m.author.id === client.user.id && m.components.length)) {
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

                await vChannel.send({ embeds: [verifyEmbed], components: [row] });
            }
        }

        // --- 2. Instrucciones de la 𝐙𝐎𝐍𝐀 𝐌𝐔𝐓𝐄 ---
        const sChannel = await client.channels.fetch(config.supportScamChannel).catch(() => null);
        if (sChannel) {
            // Usamos fetchPins() que es el método actual
            const pins = await sChannel.messages.fetchPins();

            // Si el bot no ha fijado su mensaje de instrucciones, lo envía y lo fija
            if (!pins.some(m => m.author.id === client.user.id)) {
                const muteEmbed = new EmbedBuilder()
                    .setTitle("📌 Instrucciones de la 𝐙𝐎𝐍𝐀 𝐌𝐔𝐓𝐄")
                    .setDescription(
                        "Si estás viendo este canal, es porque nuestro sistema de seguridad detectó actividad sospechosa en tu cuenta.\n\n" +
                        "**¿Qué debo hacer?**\n" +
                        "1️⃣ **Cambiar tu contraseña:** Es probable que tu cuenta haya sido vulnerada.\n" +
                        "2️⃣ **Activar 2FA:** Recomendamos usar la autenticación en dos pasos.\n" +
                        "3️⃣ **Avisar al Staff:** Una vez que tu cuenta sea segura, escribí en este canal para que un administrador te devuelva tus roles.\n\n" +
                        "*Gracias por ayudar a mantener seguro el servidor de Capi Netta RP.*"
                    )
                    .setColor(0xf1c40f)
                    .setFooter({ text: "Sistema de Seguridad Automático" });

                const msg = await sChannel.send({ embeds: [muteEmbed] });
                await msg.pin().catch(err => logError(client, err, "Pinning Mute Instructions"));
            }
        }
    },
};