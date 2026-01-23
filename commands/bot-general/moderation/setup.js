const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { updateGuildSettings } = require('../../../utils/dataHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Configura los canales y roles del bot para este servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(opt => opt.setName('logs').setDescription('Canal de logs').setRequired(true).addChannelTypes(ChannelType.GuildText))
        .addChannelOption(opt => opt.setName('verificacion').setDescription('Canal de verificación').setRequired(true).addChannelTypes(ChannelType.GuildText))
        .addRoleOption(opt => opt.setName('rol_usuario').setDescription('Rol de usuario verificado').setRequired(true))
        .addRoleOption(opt => opt.setName('rol_sin_verificar').setDescription('Rol inicial').setRequired(true))
        .addRoleOption(opt => opt.setName('rol_muteado').setDescription('Rol de aislamiento').setRequired(true)),

    async execute(interaction) {
        const settings = {
            logs: interaction.options.getChannel('logs').id,
            verify: interaction.options.getChannel('verificacion').id,
            rUser: interaction.options.getRole('rol_usuario').id,
            rNoVerify: interaction.options.getRole('rol_sin_verificar').id,
            rMuted: interaction.options.getRole('rol_muteado').id,
        };

        await updateGuildSettings(interaction.guild.id, settings);
        await interaction.reply({ content: "✅ Configuración guardada. El bot ya es funcional en este servidor.", ephemeral: true });
    }
};