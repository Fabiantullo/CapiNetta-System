/**
 * @file interactionCreate.js
 * @description Manejador de interacciones para el bot de Whitelist.
 * Inyecta funciones de utilidad (Dependency Injection) a los comandos para simplificar su lógica.
 */

const config = require("../../config");
const { EmbedBuilder, MessageFlags } = require("discord.js");

/**
 * Función auxiliar para enviar embeds estandarizados de Whitelist.
 * Se pasa como argumento a los comandos `aprobar/rechazar`.
 * 
 * @param {TextChannel} channel - Canal destino.
 * @param {User} user - Usuario afectado.
 * @param {string} estado - "aprobada" | "rechazada"
 * @param {HexColorString} color - Color del embed.
 * @param {string} [normativa=""] - Texto extra (razón/normativa).
 */
async function sendWhitelistEmbed(channel, user, estado, color, normativa = "") {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(estado === "aprobada" ? "✅ Whitelist Aprobada" : "❌ Whitelist Rechazada")
        .setDescription(
            `Usuario: <@${user.id}>\nEstado: **${estado.toUpperCase()}**\n${estado === "rechazada" ? `\nNormativa:\n${normativa}` : "\n\nYa podés ingresar al servidor."}`
        )
        .setFooter({ text: "By Capi Netta RP" })
        .setTimestamp();

    await channel.send({ embeds: [embed] });
}

module.exports = {
    name: "interactionCreate",
    async execute(client, interaction) {
        if (!interaction.isChatInputCommand()) return;

        // 🔒 VERIFICACIÓN DE SEGURIDAD (STAFF o ADMIN)
        const hasStaffRole = interaction.member.roles.cache.has(config.whitelist.staffRoleId);
        const { PermissionsBitField } = require('discord.js');
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!hasStaffRole && !isAdmin) {
            return interaction.reply({ content: "⛔ Acceso denegado. Solo Staff o Administrador.", flags: [MessageFlags.Ephemeral] });
        }

        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            // Inyectamos `sendWhitelistEmbed` para que los comandos la usen sin requerirla
            await command.execute(interaction, { sendWhitelistEmbed });
        } catch (error) {
            console.error("❌ Error WL Interaction:", error);
            if (!interaction.replied) {
                interaction.reply({ content: "❌ Error interno del bot.", flags: [MessageFlags.Ephemeral] });
            }
        }
    },
};
