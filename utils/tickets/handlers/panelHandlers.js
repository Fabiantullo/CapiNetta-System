/**
 * @file panelHandlers.js
 * @description Generador y controlador del Panel visual de creación de Tickets.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, MessageFlags } = require('discord.js');
const { getTicketCategories } = require('../index'); // or just '..' if index is parent
const { updateGuildSettings } = require('../../dataHandler');

/**
 * Genera el payload (embed, components, files) del panel para ser reutilizado en envíos y ediciones.
 */
function generatePanelPayload(categories) {
    const file = new AttachmentBuilder('./assets/logo.png');

    const description = [
        "### ¡Te damos la bienvenida al soporte de Capi Netta RP!",
        "Seleccioná la opción que mejor se adapte a tu consulta para ser atendido por el staff correspondiente."
    ];

    categories.forEach(c => {
        description.push(`### ${c.emoji} ${c.name}\n${c.description}`);
    });

    description.push("⚠️ **El mal uso de este sistema conlleva sanciones.**");

    const embed = new EmbedBuilder()
        .setTitle("CENTRO DE SOPORTE | CAPI NETTA RP")
        .setDescription(description.join('\n'))
        .setThumbnail('attachment://logo.png')
        .setColor(0x2ecc71)
        .setFooter({ text: "Sistema de Tickets Automático" });

    // Grid System: Max 3 botones por fila para que no se estiren tanto
    const rows = [];
    let currentRow = new ActionRowBuilder();

    categories.forEach((c, index) => {
        const btn = new ButtonBuilder()
            .setCustomId(`create_ticket_${c.name}`)
            .setLabel(c.name)
            .setEmoji(c.emoji)
            .setStyle(ButtonStyle.Secondary);

        currentRow.addComponents(btn);

        // Si la fila tiene 3 botones o es el último, la empujamos
        if (currentRow.components.length >= 3) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
        }
    });

    // Si quedaron botones sueltos en una fila incompleta
    if (currentRow.components.length > 0) rows.push(currentRow);

    return { embeds: [embed], components: rows, files: [file] };
}

async function handleSendPanel(interaction) {
    const categories = await getTicketCategories(interaction.guild.id);
    if (categories.length === 0) return interaction.reply({ content: "⚠️ Primero debes añadir categorías con `/ticket add`.", flags: [MessageFlags.Ephemeral] });

    const payload = generatePanelPayload(categories);
    const targetChannel = interaction.options.getChannel('canal') || interaction.channel;

    // Confirmación para evitar enviarlo en un canal equivocado
    await interaction.reply({ content: `Vas a publicar el panel en ${targetChannel}. Confirmá con ✅`, flags: [MessageFlags.Ephemeral] });
    const msg = await interaction.fetchReply();
    await msg.react('✅');

    const filter = (reaction, user) => reaction.emoji.name === '✅' && user.id === interaction.user.id;
    try {
        await msg.awaitReactions({ filter, max: 1, time: 15000 });
    } catch {
        return interaction.editReply({ content: 'Operación cancelada por timeout.', flags: [MessageFlags.Ephemeral] });
    }

    const sentMessage = await targetChannel.send(payload);

    // Guardamos la ubicación del panel para Auto-Updates
    await updateGuildSettings(interaction.guild.id, {
        ticketPanelChannel: targetChannel.id,
        ticketPanelMessage: sentMessage.id
    });

    return interaction.editReply({ content: "✅ Panel enviado y vinculado para actualizaciones automáticas.", flags: [MessageFlags.Ephemeral] });
}

module.exports = { handleSendPanel, generatePanelPayload };
