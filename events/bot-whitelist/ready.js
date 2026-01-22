const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config").general;
const { logError } = require("../../utils/logger");

module.exports = {
    name: "clientReady",
    once: true,
    async execute(client) {
        console.log(`✅ Conectado como ${client.user.tag}`);

        // --- Lógica del Canal de Verificación ---
        const verifyChannel = await client.channels.fetch(config.verifyChannel).catch(() => null);
        if (verifyChannel) {
            const messages = await verifyChannel.messages.fetch({ limit: 10 });
            const alreadySent = messages.some(m => m.author.id === client.user.id && m.components.length);

            if (!alreadySent) {
                const embed = new EmbedBuilder()
                    .setAuthor({ name: "Administración | Capi Netta RP" })
                    .setTitle("Obtén tu verificación")
                    .setDescription("¡Bienvenido/a a **Capi Netta RP**!\n\n⏱️ Permanecé **1 minuto** en el servidor\n📜 Leé y aceptá las normativas\n\nLuego presioná el botón ✅")
                    .setColor(0x3498db)
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("verify").setEmoji("✅").setLabel("Verificarme").setStyle(ButtonStyle.Success)
                );
                await verifyChannel.send({ embeds: [embed], components: [row] });
            }
        }

        // --- Lógica del Canal de Soporte (Mensaje Fijado) ---
        const supportChannel = await client.channels.fetch(config.supportScamChannel).catch(() => null);
        if (supportChannel) {
            const pinnedMessages = await supportChannel.messages.fetchPinned();
            const alreadyPinned = pinnedMessages.some(m => m.author.id === client.user.id);

            if (!alreadyPinned) {
                const supportEmbed = new EmbedBuilder()
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

                const msg = await supportChannel.send({ embeds: [supportEmbed] });
                await msg.pin().catch(err => logError(client, err, "Pin Support Message"));
            }
        }
    },
};