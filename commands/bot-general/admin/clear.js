/**
 * @file clear.js
 * @description Comando para eliminación masiva de mensajes (Bulk Delete).
 * Requiere permisos de gestión de mensajes y respeta el límite de 14 días de Discord.
 */

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
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
        .addUserOption(opt =>
            opt.setName('usuario')
                .setDescription('Filtrar mensajes de un usuario específico')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const amount = interaction.options.getInteger('cantidad');
        const targetUser = interaction.options.getUser('usuario');
        const channel = interaction.channel;

        let deletedSize = 0;

        if (targetUser) {
            // Modo Filtrado: Buscamos en los últimos 100 mensajes
            const messages = await channel.messages.fetch({ limit: 100 });
            const userMessages = messages.filter(m => m.author.id === targetUser.id).first(amount);

            if (userMessages.length === 0) {
                return interaction.reply({
                    content: `⚠️ No encontré mensajes recientes de **${targetUser.tag}** para borrar.`,
                    flags: [MessageFlags.Ephemeral]
                });
            }

            const deleted = await channel.bulkDelete(userMessages, true).catch(() => null);
            deletedSize = deleted ? deleted.size : 0;

        } else {
            // Modo Normal: Borrado a granel
            const deleted = await channel.bulkDelete(amount, true).catch(() => null);
            deletedSize = deleted ? deleted.size : 0;
        }

        if (deletedSize === 0) {
            return interaction.reply({
                content: '❌ No se pudieron borrar mensajes. Probablemente sean antiguos (>14 días) o no tenga permisos.',
                flags: [MessageFlags.Ephemeral]
            });
        }

        // Respuesta efímera al admin
        const confirmationMsg = targetUser
            ? `🧹 Se eliminaron **${deletedSize}** mensajes de **${targetUser.tag}**.`
            : `🧹 Se eliminaron **${deletedSize}** mensajes exitosamente.`;

        await interaction.reply({ content: confirmationMsg, flags: [MessageFlags.Ephemeral] });

        // Log de Auditoría
        const logDetail = targetUser
            ? `de ${targetUser.tag}`
            : `(Bulk)`;

        sendLog(
            interaction.client,
            interaction.user,
            `🧹 **LIMPIEZA**: ${interaction.user.tag} eliminó ${deletedSize} mensajes ${logDetail} en <#${channel.id}>`,
            interaction.guild.id
        );
    },
};