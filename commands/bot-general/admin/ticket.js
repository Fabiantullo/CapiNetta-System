/**
 * @file ticket.js
 * @description Comando principal de administración de Tickets (/ticket).
 * Permite configurar categorías, roles, logs y enviar el Panel de Creación.
 */

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Gestión del sistema de Tickets')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        // --- SUBCOMANDOS DE CONFIGURACIÓN ---

        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Añadir una nueva categoría de tickets')
                .addStringOption(opt => opt.setName('nombre').setDescription('Nombre de la categoría (ej: Soporte Técnico)').setRequired(true))
                .addRoleOption(opt => opt.setName('rol').setDescription('Rol PRINCIPAL que atenderá estos tickets').setRequired(true))
                .addChannelOption(opt => opt.setName('categoria_discord').setDescription('Categoría de Discord donde se crearán los canales').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
                .addStringOption(opt => opt.setName('emoji').setDescription('Emoji representativo (ej: 🔧)').setRequired(true))
                .addStringOption(opt => opt.setName('descripcion').setDescription('Breve descripción para el menú').setRequired(true))
                .addRoleOption(opt => opt.setName('rol_extra_1').setDescription('Rol adicional opcional (ej: Admin)').setRequired(false))
                .addRoleOption(opt => opt.setName('rol_extra_2').setDescription('Otro rol adicional opcional').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('addrole')
                .setDescription('Agregar un rol EXTRA para ver tickets de una categoría')
                .addStringOption(opt => opt.setName('categoria').setDescription('Nombre exacto de la categoría').setRequired(true))
                .addRoleOption(opt => opt.setName('rol').setDescription('Rol extra a añadir').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('edit')
                .setDescription('Modificar una categoría existente')
                .addStringOption(opt => opt.setName('nombre_actual').setDescription('Nombre actual de la categoría a editar').setRequired(true))
                .addStringOption(opt => opt.setName('nuevo_nombre').setDescription('Nuevo nombre (Opcional)'))
                .addStringOption(opt => opt.setName('nuevo_descripcion').setDescription('Nueva descripción (Opcional)'))
                .addStringOption(opt => opt.setName('nuevo_emoji').setDescription('Nuevo emoji (Opcional)'))
                .addRoleOption(opt => opt.setName('nuevo_rol').setDescription('Nuevo rol principal (Reemplaza la lista anterior)').setRequired(false))
                .addRoleOption(opt => opt.setName('nuevo_rol_extra_1').setDescription('Nuevo rol extra 1').setRequired(false))
                .addRoleOption(opt => opt.setName('nuevo_rol_extra_2').setDescription('Nuevo rol extra 2').setRequired(false))
                .addChannelOption(opt => opt.setName('nueva_categoria').setDescription('Nueva categoría de Discord destino').addChannelTypes(ChannelType.GuildCategory))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Eliminar una categoría existente')
                .addStringOption(opt => opt.setName('nombre').setDescription('Nombre exacto de la categoría a borrar').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('Listar todas las categorías configuradas')
        )
        .addSubcommand(sub =>
            sub.setName('metrics')
                .setDescription('Muestra estadísticas de rendimiento del sistema de tickets')
        )
        .addSubcommand(sub =>
            sub.setName('panel')
                .setDescription('Enviar el panel de creación de tickets a un canal')
                .addChannelOption(opt => opt.setName('canal').setDescription('Canal destino del panel').addChannelTypes(ChannelType.GuildText))
        )
        .addSubcommand(sub =>
            sub.setName('setlogs')
                .setDescription('Configurar el canal donde se enviarán los transcripts')
                .addChannelOption(opt => opt.setName('canal').setDescription('Canal de Logs de Tickets').addChannelTypes(ChannelType.GuildText).setRequired(true))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const {
            handleSetLogs, handleAddCategory, handleAddRole,
            handleEditCategory, handleRemoveCategory, handleListCategories,
            handleSendPanel, handleMetrics
        } = require('../../../utils/tickets');

        try {
            switch (sub) {
                case 'setlogs': return await handleSetLogs(interaction);
                case 'add': return await handleAddCategory(interaction);
                case 'addrole': return await handleAddRole(interaction);
                case 'edit': return await handleEditCategory(interaction);
                case 'remove': return await handleRemoveCategory(interaction);
                case 'list': return await handleListCategories(interaction);
                case 'panel': return await handleSendPanel(interaction);
                case 'metrics': return await handleMetrics(interaction);
                default: return interaction.reply({ content: "❌ Subcomando no reconocido.", flags: [MessageFlags.Ephemeral] });
            }
        } catch (error) {
            console.error("Error executing ticket command:", error);
            // Evitar doble reply si ya se respondió dentro del handler
            if (!interaction.replied && !interaction.deferred) {
                return interaction.reply({ content: "❌ Error interno ejecutando el comando.", flags: [MessageFlags.Ephemeral] });
            }
        }
    }
};
