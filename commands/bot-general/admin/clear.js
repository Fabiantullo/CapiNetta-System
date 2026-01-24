/**
 * @file clear.js
 * @description Comando para eliminación masiva de mensajes (Bulk Delete).
 * Requiere permisos de gestión de mensajes y respeta el límite de 14 días de Discord.
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('../../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Borra una cantidad específica de mensajes recientes')
        .addIntegerOption(opt =>
            opt.setName('cantidad')
                .setDescription('Número de mensajes a borrar (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const amount = interaction.options.getInteger('cantidad');

        // bulkDelete retorna una colección con los mensajes borrados
        const deleted = await interaction.channel.bulkDelete(amount, true).catch(() => null);

        if (!deleted || deleted.size === 0) {
            return interaction.reply({
                content: '❌ No se pudieron borrar mensajes. Probablemente sean antiguos (>14 días) o no tenga permisos.',
                ephemeral: true
            });
        }

        // Respuesta efímera al admin
        await interaction.reply({ content: `🧹 Se eliminaron **${deleted.size}** mensajes exitosamente.`, ephemeral: true });

        // Log de Auditoría
        sendLog(
            interaction.client,
            interaction.user,
            `🧹 **LIMPIEZA**: ${interaction.user.tag} eliminó ${deleted.size} mensajes en el canal <#${interaction.channel.id}>`,
            interaction.guild.id
        );
    },
};