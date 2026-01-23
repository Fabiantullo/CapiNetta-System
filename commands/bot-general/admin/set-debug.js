const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
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
            // 1. Buscamos la configuración actual
            const currentSettings = await getGuildSettings(guildId);

            if (!currentSettings) {
                return interaction.reply({
                    content: "⚠️ No encontré una configuración base. Por favor, ejecutá `/setup` primero para inicializar el servidor.",
                    ephemeral: true
                });
            }

            // 2. Mapeamos los datos viejos y solo reemplazamos el canal de debug
            const updatedSettings = {
                logs: currentSettings.logsChannel,
                verify: currentSettings.verifyChannel,
                rUser: currentSettings.roleUser,
                rNoVerify: currentSettings.roleNoVerify,
                rMuted: currentSettings.roleMuted,
                welcome: currentSettings.welcomeChannel,
                support: currentSettings.supportChannel,
                debug: newDebugChannel // <-- El cambio quirúrgico
            };

            // 3. Guardamos en la MariaDB
            await updateGuildSettings(guildId, updatedSettings);

            await interaction.reply({
                content: `✅ Canal de estado actualizado a <#${newDebugChannel}> sin tocar el resto de la config.`,
                ephemeral: true
            });

        } catch (error) {
            // Si algo falla, lo mandamos al logger (que ahora usa el client)
            await logError(interaction.client, error, "Comando set-debug", guildId);
            await interaction.reply({ content: "❌ Error al actualizar la base de datos.", ephemeral: true });
        }
    },
};