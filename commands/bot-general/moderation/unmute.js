const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getUserRoles, clearUserRoles } = require('../../../utils/dataHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Restaura roles y limpia estado de cuarentena en DB.')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply({ content: 'No encontrado.', ephemeral: true });

        const savedRoles = await getUserRoles(interaction.guild.id, user.id);

        try {
            if (savedRoles && savedRoles.length > 0) {
                await member.roles.set(savedRoles);
                await clearUserRoles(interaction.guild.id, user.id); // Limpieza de persistencia
                await interaction.reply(`✅ **${user.tag}** liberado y roles restaurados.`);
            } else {
                await interaction.reply({ content: "⚠️ No hay roles guardados para este usuario.", ephemeral: true });
            }
        } catch (err) {
            await interaction.reply({ content: "❌ Error de jerarquía al restaurar roles.", ephemeral: true });
        }
    },
};