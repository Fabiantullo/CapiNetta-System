const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../../config').general;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Libera a un usuario de la zona mute.')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply({ content: 'No encontrado.', ephemeral: true });

        // Devuelve el rol de usuario normal
        await member.roles.set([config.roleUser]);
        await user.send("✅ Ya recuperaste tus permisos en **Capi Netta RP**. ¡Bienvenido de vuelta!").catch(() => { });

        await interaction.reply(`✅ **${user.tag}** fue liberado correctamente.`);
    },
};