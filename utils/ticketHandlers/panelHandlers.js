/**
 * @file panelHandlers.js
 * @description Generador y controlador del Panel visual de creación de Tickets.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, MessageFlags } = require('discord.js');
const { getTicketCategories } = require('../../ticketDB'); // Ajuste path

async function handleSendPanel(interaction) {
    const categories = await getTicketCategories(interaction.guild.id);
    if (categories.length === 0) return interaction.reply({ content: "⚠️ Primero debes añadir categorías con `/ticket add`.", flags: [MessageFlags.Ephemeral] });

    const file = new AttachmentBuilder('./assets/logo.png');

    const description = [
        "**¡Bienvenido al sistema de soporte oficial de Capi Netta RP!**",
        "Selecciona la opción que mejor se adapte a tu consulta para ser atendido por el staff correspondiente.\n"
    ];

    categories.forEach(c => {
        description.push(`> **${c.emoji} ${c.name}**\n> *${c.description}*\n`);
    });

    description.push("⚠️ **El mal uso de este sistema conlleva sanciones.**");

    const embed = new EmbedBuilder()
        .setTitle("CENTRO DE SOPORTE | CAPI NETTA RP")
        .setDescription(description.join('\n'))
        .setThumbnail('attachment://logo.png')
        .setColor(0x2ecc71)
        .setFooter({ text: "Sistema de Tickets Automático" });

    const rows = [];
    let currentRow = new ActionRowBuilder();

    categories.forEach((c, index) => {
        const btn = new ButtonBuilder()
            .setCustomId(`create_ticket_${c.name}`)
            .setLabel(c.name)
            .setEmoji(c.emoji)
            .setStyle(ButtonStyle.Secondary);

        if (currentRow.components.length >= 5) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
        }

        currentRow.addComponents(btn);
    });

    if (currentRow.components.length > 0) rows.push(currentRow);

    await interaction.channel.send({ embeds: [embed], components: rows, files: [file] });
    return interaction.reply({ content: "✅ Panel (Modo Botones) enviado.", flags: [MessageFlags.Ephemeral] });
}

module.exports = { handleSendPanel };
