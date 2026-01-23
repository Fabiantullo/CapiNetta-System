const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('../../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Borra una cantidad específica de mensajes')
        .addIntegerOption(opt => opt.setName('cantidad').setDescription('Número de mensajes a borrar (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const amount = interaction.options.getInteger('cantidad');

        const deleted = await interaction.channel.bulkDelete(amount, true).catch(() => null);

        if (!deleted) {
            return interaction.reply({ content: '❌ No pude borrar los mensajes (pueden tener más de 14 días).', ephemeral: true });
        }

        await interaction.reply({ content: `🧹 Se eliminaron **${deleted.size}** mensajes.`, ephemeral: true });

        // Log al canal de auditoría del servidor
        sendLog(interaction.client, interaction.user, `🧹 **LIMPIEZA**: ${interaction.user.tag} borró ${deleted.size} mensajes en <#${interaction.channel.id}>`, interaction.guild.id);
    },
};