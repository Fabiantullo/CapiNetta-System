const config = require("../../config");
const { EmbedBuilder } = require("discord.js");

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

        // 🔒 SOLO STAFF
        if (!interaction.member.roles.cache.has(config.whitelist.staffRoleId)) {
            return interaction.reply({ content: "⛔ Este comando es solo para el staff.", ephemeral: true });
        }

        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            // Pasar la función auxiliar si es necesaria, o importarla en el comando
            await command.execute(interaction, { sendWhitelistEmbed });
        } catch (error) {
            console.error("❌ Error manejando la interacción:", error);
            if (!interaction.replied) {
                interaction.reply({ content: "❌ Ocurrió un error al procesar el comando.", ephemeral: true });
            }
        }
    },
};
