const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildSettings } = require('../../../utils/dataHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Muestra la configuración actual del bot en este servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const settings = await getGuildSettings(interaction.guild.id);

        if (!settings) {
            return interaction.reply({ content: "⚠️ El servidor no está configurado. Usa `/setup`.", ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle(`⚙️ Configuración: ${interaction.guild.name}`)
            .setColor(0x3498db)
            .addFields(
                { name: '📝 Logs Auditoría', value: `<#${settings.logsChannel}>`, inline: true },
                { name: '🚨 Logs Estado', value: settings.debugChannel ? `<#${settings.debugChannel}>` : '*No configurado*', inline: true },
                { name: '✅ Verificación', value: `<#${settings.verifyChannel}>`, inline: true },
                { name: '👤 Rol Usuario', value: `<@&${settings.roleUser}>`, inline: true },
                { name: '🔇 Rol Mute', value: `<@&${settings.roleMuted}>`, inline: true }
            )
            .setFooter({ text: `ID del Servidor: ${interaction.guild.id}` });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};