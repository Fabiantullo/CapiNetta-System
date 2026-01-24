/**
 * @file reset-warns.js
 * @description Comando administrativo para limpiar el historial de advertencias activas de un usuario.
 * Útil tras un indulto o error de moderación.
 */

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { saveWarnToDB } = require('../../../utils/dataHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset-warns')
        .setDescription('Resetea las advertencias activas de un usuario a 0')
        .addUserOption(opt => opt.setName('usuario').setDescription('El usuario a limpiar').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const user = interaction.options.getUser('usuario');

        // 1. Actualizar persistencia en DB
        await saveWarnToDB(user.id, 0);

        // 2. Actualizar caché en memoria (si el bot mantiene un Map local)
        if (interaction.client.warnMap) {
            interaction.client.warnMap.set(user.id, 0);
        }

        await interaction.reply({ content: `✅ Historial limpio. Se han reseteado las advertencias de **${user.tag}**.`, flags: [MessageFlags.Ephemeral] });
    },
};