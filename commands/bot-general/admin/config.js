const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildSettings } = require('../../../utils/dataHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Muestra la configuración completa del bot en este servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Obtenemos todos los datos de la MariaDB para este server
        const settings = await getGuildSettings(interaction.guild.id);

        if (!settings) {
            return interaction.reply({
                content: "⚠️ El servidor no tiene una configuración activa. Ejecutá `/setup` para inicializarlo.",
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`⚙️ Panel de Configuración | ${interaction.guild.name}`)
            .setDescription("Acá tenés el mapeo completo de canales y roles que el bot está usando actualmente.")
            .setColor(0x3498db)
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .addFields(
                {
                    name: '📂 Canales de Sistema', value: [
                        `**Auditoría:** ${settings.logsChannel ? `<#${settings.logsChannel}>` : '❌ *No seteado*'}`,
                        `**Estado/Errores:** ${settings.debugChannel ? `<#${settings.debugChannel}>` : '❌ *No seteado*'}`,
                        `**Verificación:** ${settings.verifyChannel ? `<#${settings.verifyChannel}>` : '❌ *No seteado*'}`
                    ].join('\n'), inline: false
                },

                {
                    name: '🏠 Canales de Comunidad', value: [
                        `**Bienvenida:** ${settings.welcomeChannel ? `<#${settings.welcomeChannel}>` : '❌ *No seteado*'}`,
                        `**Aislamiento (Soporte):** ${settings.supportChannel ? `<#${settings.supportChannel}>` : '❌ *No seteado*'}`
                    ].join('\n'), inline: false
                },

                {
                    name: '🎭 Gestión de Roles', value: [
                        `**Usuario Verificado:** ${settings.roleUser ? `<@&${settings.roleUser}>` : '❌ *No seteado*'}`,
                        `**Sin Verificar:** ${settings.roleNoVerify ? `<@&${settings.roleNoVerify}>` : '❌ *No seteado*'}`,
                        `**Aislado (Mute):** ${settings.roleMuted ? `<@&${settings.roleMuted}>` : '❌ *No seteado*'}`
                    ].join('\n'), inline: false
                }
            )
            .setFooter({ text: `Server ID: ${interaction.guild.id} • Estado: ${settings.isSetup ? '✅ Configurado' : '⚠️ Incompleto'}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};