const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../../config').general;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Devuelve los roles normales a un usuario verificado.')
        .addUserOption(option =>
            option.setName('usuario').setDescription('Usuario a desmutear').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: 'Usuario no encontrado.', ephemeral: true });

        // Restaurar roles
        const roleMuted = interaction.guild.roles.cache.get(config.roleMuted);
        const roleUser = interaction.guild.roles.cache.get(config.roleUser);

        if (roleMuted) await member.roles.remove(roleMuted).catch(() => { });
        if (roleUser) await member.roles.add(roleUser).catch(() => { });

        await interaction.reply({ content: `✅ **${user.tag}** ha sido verificado y recuperó sus permisos.`, ephemeral: false });

    },
};