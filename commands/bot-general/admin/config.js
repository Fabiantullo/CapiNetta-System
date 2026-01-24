const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    ComponentType
} = require('discord.js');
const { getGuildSettings } = require('../../../utils/dataHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Panel de control y configuración del bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const guildId = interaction.guild.id;

        // 1. Función para generar el Embed del Dashboard
        async function generateDashboardEmbed(guild) {
            const settings = await getGuildSettings(guild.id);

            if (!settings) return null;

            return new EmbedBuilder()
                .setTitle(`⚙️ Panel de Control | ${guild.name}`)
                .setDescription("Estado actual de la vinculación con MariaDB y Discord.")
                .setColor(0x3498db)
                .setThumbnail(guild.iconURL({ dynamic: true }))
                .addFields(
                    {
                        name: '📂 Canales de Sistema', value: [
                            `**Auditoría:** ${settings.logsChannel ? `<#${settings.logsChannel}>` : '❌ *No seteado*'}`,
                            `**Estado:** ${settings.debugChannel ? `<#${settings.debugChannel}>` : '❌ *No seteado*'}`,
                            `**Verificación:** ${settings.verifyChannel ? `<#${settings.verifyChannel}>` : '❌ *No seteado*'}`
                        ].join('\n'), inline: false
                    },
                    {
                        name: '🎭 Gestión de Roles', value: [
                            `**Usuario:** ${settings.roleUser ? `<@&${settings.roleUser}>` : '❌ *No seteado*'}`,
                            `**Muteado:** ${settings.roleMuted ? `<@&${settings.roleMuted}>` : '❌ *No seteado*'}`
                        ].join('\n'), inline: false
                    }
                )
                .setFooter({ text: `Server ID: ${guild.id} • Capi Netta RP` })
                .setTimestamp();
        }

        const embed = await generateDashboardEmbed(interaction.guild);

        if (!embed) {
            return interaction.reply({
                content: "⚠️ El servidor no tiene configuración. Usá `/setup` para empezar.",
                flags: [MessageFlags.Ephemeral]
            });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('start_wizard')
                .setLabel('⚙️ Editar Configuración')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('refresh_config')
                .setLabel('🔄 Refrescar')
                .setStyle(ButtonStyle.Secondary)
        );

        const response = await interaction.reply({
            embeds: [embed],
            components: [row],
            flags: [MessageFlags.Ephemeral]
        });

        // 2. Manejo de botones del Dashboard
        const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'refresh_config') {
                const newEmbed = await generateDashboardEmbed(interaction.guild);
                return i.update({ embeds: [newEmbed] });
            }

            if (i.customId === 'start_wizard') {
                // Al presionar editar, avisamos que debe usar /setup para el wizard completo o 
                // podríamos disparar la lógica del setup aquí. 
                // Por simplicidad y para no duplicar 200 líneas de código, lo redirigimos:
                await i.reply({
                    content: "🚀 **Lanzando Asistente...** Por seguridad y orden, usá el comando `/setup` para iniciar el Wizard interactivo y modificar los canales o roles.",
                    flags: [MessageFlags.Ephemeral]
                });
            }
        });
    },
};