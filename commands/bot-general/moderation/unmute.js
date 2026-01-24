/**
 * @file unmute.js
 * @description Comando para levantar sanciones (Cuarentena/Mute).
 * Restaura los roles que el usuario tenía antes de la sanción (usando persistencia en DB)
 * y elimina el registro de "Aislamiento".
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getUserRoles, clearUserRoles } = require('../../../utils/dataHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Libera a un usuario y restaura sus roles originales.')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a liberar').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ Usuario no encontrado en el servidor.', ephemeral: true });

        // Recuperar roles guardados
        const savedRoles = await getUserRoles(interaction.guild.id, user.id);

        try {
            if (savedRoles && savedRoles.length > 0) {
                // Restaurar roles
                await member.roles.set(savedRoles);

                // Limpiar registro DB para evitar conflictos futuros
                await clearUserRoles(interaction.guild.id, user.id);

                await interaction.reply(`✅ **${user.tag}** ha sido liberado de la sanción y sus roles han sido restaurados.`);
            } else {
                await interaction.reply({ content: "⚠️ No encontré roles guardados para este usuario (Quizás no fue muteado por el bot o DB limpia).", ephemeral: true });
            }
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: "❌ Error de permisos al intentar restaurar roles (Jerarquía).", ephemeral: true });
        }
    },
};