const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('../../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsa a un miembro del servidor')
        .addUserOption(opt => opt.setName('usuario').setDescription('El usuario a expulsar').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Razón de la expulsión'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('razon') || 'Sin razón especificada';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member || !member.kickable) return interaction.reply({ content: '❌ No puedo expulsar a este usuario.', ephemeral: true });

        await member.kick(reason);
        await interaction.reply({ content: `✅ **${user.tag}** fue expulsado. Razón: ${reason}` });

        sendLog(interaction.client, interaction.user, `👞 **KICK**: ${user.tag} expulsado por ${interaction.user.tag}. Razón: ${reason}`, interaction.guild.id);
    },
};