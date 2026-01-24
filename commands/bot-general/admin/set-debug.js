/**
 * @file set-debug.js
 * @description Comando rápido para reconfigurar el canal de Debug del servidor.
 * Permite cambiar solo el canal de alertas sin pasar por todo el wizard de /setup.
 */

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const { getGuildSettings, updateGuildSettings } = require('../../../utils/dataHandler');
const { logError } = require('../../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-debug')
        .setDescription('Cambia únicamente el canal de logs de error/estado')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(opt =>
            opt.setName('canal')
                .setDescription('El nuevo canal para reportes del sistema')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        ),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const newDebugChannel = interaction.options.getChannel('canal').id;

        try {
            // 1. Obtener configuración actual para no perder datos
            const currentSettings = await getGuildSettings(guildId);

            if (!currentSettings) {
                return interaction.reply({
                    content: "⚠️ Configuración no encontrada. Ejecutá `/setup` para inicializar el servidor primero.",
                    flags: [MessageFlags.Ephemeral]
                });
            }

            // 2. Actualizar solo el campo 'debug' (partial update)
            // Nota: updateGuildSettings usa MERGE/UPSERT en SQL, pero pasamos ID para asegurar integridad
            await updateGuildSettings(guildId, {
                debugChannel: newDebugChannel // Usamos la key correcta que espera DB
            });

            await interaction.reply({
                content: `✅ Canal de Debug redirigido a <#${newDebugChannel}> correctamente.`,
                flags: [MessageFlags.Ephemeral]
            });

        } catch (error) {
            await logError(interaction.client, error, "Comando set-debug", guildId);
            await interaction.reply({ content: "❌ Error actualizando la base de datos.", flags: [MessageFlags.Ephemeral] });
        }
    },
};