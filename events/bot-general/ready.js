const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config").general; //
const { logError } = require("../../utils/logger");

module.exports = {
    name: "clientReady", // Cambiado para que no tire más el "DeprecationWarning"
    once: true,
    async execute(client) {
        console.log(`✅ ${client.user.tag} está online.`);

        // --- 1. MENSAJE DE VERIFICACIÓN ---
        const vChannel = await client.channels.fetch(config.verifyChannel).catch(() => null);
        if (vChannel) {
            const msgs = await vChannel.messages.fetch({ limit: 10 });
            // Buscamos si el bot ya mandó el mensaje (evita duplicados)
            const alreadySent = msgs.find(m => m.author.id === client.user.id && m.components.length > 0);

            if (!alreadySent) {
                const verifyEmbed = new EmbedBuilder()
                    .setAuthor({ name: "Administración | Capi Netta RP" }) //
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

        // --- 2. INSTRUCCIONES ZONA MUTE ---
        const sChannel = await client.channels.fetch(config.supportScamChannel).catch(() => null);
        if (sChannel) {
            try {
                // Obtenemos los mensajes fijados
                const pins = await sChannel.messages.fetchPins();

                // Lógica ultra-compatible para evitar el error .some / .values
                let alreadyPinned = false;
                pins.forEach(m => {
                    if (m.author.id === client.user.id) alreadyPinned = true;
                });

                if (!alreadyPinned) {
                    const muteEmbed = new EmbedBuilder()
                        .setTitle("📌 Instrucciones de la **ZONA MUTE**") //
                        .setDescription(
                            "Si estás viendo este canal, es porque nuestro sistema de seguridad detectó actividad sospechosa en tu cuenta.\n\n" +
                            "**¿Qué debo hacer?**\n" +
                            "1️⃣ **Cambiar tu contraseña:** Es probable que tu cuenta haya sido vulnerada.\n" +
                            "2️⃣ **Activar 2FA:** Recomendamos usar la autenticación en dos pasos.\n" +
                            "3️⃣ **Avisar al Staff:** Una vez que tu cuenta sea segura, escribí en este canal para que un administrador te devuelva tus roles.\n\n" +
                            "*Gracias por ayudar a mantener seguro el servidor de Capi Netta RP.*\n" +
                            "Sistema de Seguridad Automático"
                        )
                        .setColor(0xf1c40f);

                    const msg = await sChannel.send({ embeds: [muteEmbed] });
                    await msg.pin().catch(() => { });
                }
            } catch (err) {
                console.error("Error en Pins de Soporte:", err);
            }
        }
    },
};