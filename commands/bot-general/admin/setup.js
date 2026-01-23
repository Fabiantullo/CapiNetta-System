const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { updateGuildSettings } = require('../../../utils/dataHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Configuración total del bot para este servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        // Canales Obligatorios
        .addChannelOption(opt => opt.setName('logs').setDescription('Logs de auditoría (mensajes, roles, etc.)').setRequired(true).addChannelTypes(ChannelType.GuildText))
        .addChannelOption(opt => opt.setName('verificacion').setDescription('Canal donde se encuentra el botón de acceso').setRequired(true).addChannelTypes(ChannelType.GuildText))
        // Roles Obligatorios
        .addRoleOption(opt => opt.setName('rol_usuario').setDescription('Rol otorgado al verificarse').setRequired(true))
        .addRoleOption(opt => opt.setName('rol_sin_verificar').setDescription('Rol inicial de entrada').setRequired(true))
        .addRoleOption(opt => opt.setName('rol_muteado').setDescription('Rol de aislamiento preventivo').setRequired(true))
        // Canales Opcionales / Adicionales
        .addChannelOption(opt => opt.setName('bienvenida').setDescription('Canal donde se enviarán los saludos de ingreso').addChannelTypes(ChannelType.GuildText))
        .addChannelOption(opt => opt.setName('soporte').setDescription('Canal de soporte para usuarios aislados').addChannelTypes(ChannelType.GuildText))
        .addChannelOption(opt => opt.setName('estado').setDescription('Logs internos de errores del sistema').addChannelTypes(ChannelType.GuildText)),

    async execute(interaction) {
        // Capturamos todas las opciones, usando null si las opcionales no se envían
        const settings = {
            logs: interaction.options.getChannel('logs').id,
            verify: interaction.options.getChannel('verificacion').id,
            rUser: interaction.options.getRole('rol_usuario').id,
            rNoVerify: interaction.options.getRole('rol_sin_verificar').id,
            rMuted: interaction.options.getRole('rol_muteado').id,
            welcome: interaction.options.getChannel('bienvenida')?.id || null,
            support: interaction.options.getChannel('soporte')?.id || null,
            debug: interaction.options.getChannel('estado')?.id || null
        };

        try {
            // Guardamos la configuración completa en MariaDB
            await updateGuildSettings(interaction.guild.id, settings);

            await interaction.reply({
                content: "✅ **Configuración exitosa.** Todos los módulos del bot han sido vinculados a los canales y roles especificados.",
                ephemeral: true
            });
        } catch (error) {
            // En caso de fallo, usamos nuestro logger escalable
            const { logError } = require('../../../utils/logger');
            await logError(interaction.client, error, "Comando Setup", interaction.guild.id);
            await interaction.reply({ content: "❌ Hubo un error al guardar la configuración en la base de datos.", ephemeral: true });
        }
    }
};