/**
 * @file kick.js
 * @description Comando para expulsar miembros.
 * Incluye validación de permisos y registro en el canal de logs del servidor.
 */

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { sendLog } = require('../../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsa a un miembro del servidor')
        .addUserOption(opt => opt.setName('usuario').setDescription('El usuario a expulsar').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Razón de la expulsión'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('razon') || 'Sin razón especificada';

        // Fetch obligatorio para verificar kickable
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ Usuario no encontrado en el servidor.', flags: [MessageFlags.Ephemeral] });

        if (!member.kickable) {
            return interaction.reply({
                content: '❌ No puedo expulsar a este usuario (Mi rol es inferior o es el dueño).',
                flags: [MessageFlags.Ephemeral]
            });
        }

        // Ejecutar Kick
        await member.kick(reason);

        await interaction.reply({ content: `✅ **${user.tag}** fue expulsado correctamente.\n📝 **Razón:** ${reason}` });

        // Enviar Log
        sendLog(
            interaction.client,
            interaction.user,
            `👞 **KICK**: ${user.tag} expulsado por ${interaction.user.tag}. Razón: ${reason}`,
            interaction.guild.id
        );
    },
};