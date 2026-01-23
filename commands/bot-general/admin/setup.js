// Archivo: capi-netta-rp/commands/bot-general/admin/setup.js
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { updateGuildSettings } = require('../../../utils/dataHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Configuración multiservidor del bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(opt => opt.setName('logs').setDescription('Logs de auditoría').setRequired(true).addChannelTypes(ChannelType.GuildText))
        .addChannelOption(opt => opt.setName('verificacion').setDescription('Canal de verificación').setRequired(true).addChannelTypes(ChannelType.GuildText))
        .addRoleOption(opt => opt.setName('rol_usuario').setDescription('Rol verificado').setRequired(true))
        .addRoleOption(opt => opt.setName('rol_sin_verificar').setDescription('Rol inicial').setRequired(true))
        .addRoleOption(opt => opt.setName('rol_muteado').setDescription('Rol de aislamiento').setRequired(true))
        .addChannelOption(opt => opt.setName('estado').setDescription('Logs de errores/sistema (Opcional)').addChannelTypes(ChannelType.GuildText)), // <-- Opcional

    async execute(interaction) {
        const settings = {
            logs: interaction.options.getChannel('logs').id,
            verify: interaction.options.getChannel('verificacion').id,
            rUser: interaction.options.getRole('rol_usuario').id,
            rNoVerify: interaction.options.getRole('rol_sin_verificar').id,
            rMuted: interaction.options.getRole('rol_muteado').id,
            debug: interaction.options.getChannel('estado')?.id || null,
            welcome: null,
            support: null
        };

        await updateGuildSettings(interaction.guild.id, settings);
        await interaction.reply({ content: "✅ Configuración guardada con éxito.", ephemeral: true });
    }
};