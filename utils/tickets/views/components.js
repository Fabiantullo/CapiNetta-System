/**
 * @file components.js
 * @description Generadores de Componentes UI (Botones, Menús) para Tickets.
 */
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, UserSelectMenuBuilder } = require('discord.js');

/**
 * Genera la fila de botones de control para un ticket (Claim, Transfer, Close).
 * @param {boolean} isClaimed - Si el ticket ya tiene dueño asignado.
 * @return {ActionRowBuilder} Fila de componentes Discord.
 */
function getTicketControls(isClaimed) {
    const row = new ActionRowBuilder();

    // BOTÓN 1: RECLAMAR
    if (!isClaimed) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('claim_ticket')
                .setLabel('Reclamar Ticket')
                .setEmoji('🙋‍♂️')
                .setStyle(ButtonStyle.Success)
        );
    }

    // BOTÓN 2: TRANSFERIR
    row.addComponents(
        new ButtonBuilder()
            .setCustomId('transfer_ticket')
            .setLabel('Transferir')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!isClaimed)
    );

    // BOTÓN 3: CERRAR
    row.addComponents(
        new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Cerrar Ticket')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Danger)
    );

    return row;
}

function getTransferSelectMenu() {
    const userSelect = new UserSelectMenuBuilder()
        .setCustomId('confirm_transfer_select')
        .setPlaceholder('Selecciona al nuevo encargado...')
        .setMaxValues(1);

    return new ActionRowBuilder().addComponents(userSelect);
}

function getCloseConfirmationButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm_close').setLabel('Sí, cerrar ticket').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('cancel_close').setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
    );
}

module.exports = {
    getTicketControls,
    getTransferSelectMenu,
    getCloseConfirmationButtons
};
