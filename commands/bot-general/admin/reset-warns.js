const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { saveWarnToDB } = require('../../../utils/dataHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset-warns')
        .setDescription('Resetea las advertencias de un usuario a 0')
        .addUserOption(opt => opt.setName('usuario').setDescription('El usuario a limpiar').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const user = interaction.options.getUser('usuario');

        // Actualizamos en la DB y en el mapa local del bot
        await saveWarnToDB(user.id, 0);
        interaction.client.warnMap.set(user.id, 0);

        await interaction.reply({ content: `✅ Se han reseteado las advertencias de **${user.tag}**.` });
    },
};