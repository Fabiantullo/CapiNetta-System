/**
 * @file configHandlers.js
 * @description Controladores para configuraciones específicas de tickets (como logs).
 */

const { MessageFlags } = require('discord.js');
const { updateGuildSettings } = require('../../dataHandler');

async function handleSetLogs(interaction) {
    const channel = interaction.options.getChannel('canal');
    try {
        await updateGuildSettings(interaction.guild.id, { ticketLogsChannel: channel.id });
        return interaction.reply({ content: `✅ Canal de transcripts configurado en ${channel}.`, flags: [MessageFlags.Ephemeral] });
    } catch (err) {
        return interaction.reply({ content: "❌ Error guardando la configuración.", flags: [MessageFlags.Ephemeral] });
    }
}

module.exports = { handleSetLogs };
