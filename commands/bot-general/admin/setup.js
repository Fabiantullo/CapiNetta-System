const {
    SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder,
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder, MessageFlags
} = require('discord.js');
const { updateGuildSettings } = require('../../../utils/dataHandler');
const { logError } = require('../../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Asistente interactivo para configurar el servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const guild = interaction.guild;

        // CONFIGURACIÓN: Nombres idénticos a las columnas de MariaDB
        let config = {
            logsChannel: null, verifyChannel: null, debugChannel: null,
            roleUser: null, roleNoVerify: null, roleMuted: null,
            welcomeChannel: null, supportChannel: null, isSetup: 1
        };

        let step = 1;

        const getEmbed = () => {
            const embed = new EmbedBuilder().setTitle("🛠️ Asistente de Configuración | Capi Netta RP").setColor(0x3498db).setTimestamp();
            if (step === 1) {
                embed.setDescription("### Paso 1: Canales del Sistema\nSeleccioná los canales para **Logs**, **Verificación** y **Debug**.");
                embed.addFields(
                    { name: "📍 Logs:", value: config.logsChannel ? `<#${config.logsChannel}>` : "❌", inline: true },
                    { name: "✅ Verificación:", value: config.verifyChannel ? `<#${config.verifyChannel}>` : "❌", inline: true },
                    { name: "🚨 Debug:", value: config.debugChannel ? `<#${config.debugChannel}>` : "❌", inline: true }
                );
            } else if (step === 2) {
                embed.setDescription("### Paso 2: Gestión de Roles\nConfigurá los roles de acceso.");
                embed.addFields(
                    { name: "👤 Usuario:", value: config.roleUser ? `<@&${config.roleUser}>` : "❌", inline: true },
                    { name: "❓ Sin Verificar:", value: config.roleNoVerify ? `<@&${config.roleNoVerify}>` : "❌", inline: true },
                    { name: "🔇 Muteado:", value: config.roleMuted ? `<@&${config.roleMuted}>` : "❌", inline: true }
                );
            } else {
                embed.setDescription("### Paso 3: Módulos Opcionales");
                embed.addFields(
                    { name: "👋 Bienvenida:", value: config.welcomeChannel ? `<#${config.welcomeChannel}>` : "🔘 Opcional", inline: true },
                    { name: "💬 Soporte:", value: config.supportChannel ? `<#${config.supportChannel}>` : "🔘 Opcional", inline: true }
                );
            }
            return embed;
        };

        const getComponents = () => {
            const rows = [];
            if (step === 1) {
                rows.push(new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('select_channels').setPlaceholder('Seleccionar canales...').addChannelTypes(ChannelType.GuildText).setMaxValues(3)));
                rows.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('next').setLabel('Siguiente ➡️').setStyle(ButtonStyle.Primary).setDisabled(!config.logsChannel || !config.verifyChannel)));
            } else if (step === 2) {
                rows.push(new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId('select_roles').setPlaceholder('Seleccionar roles...').setMaxValues(3)));
                rows.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('next').setLabel('Siguiente ➡️').setStyle(ButtonStyle.Primary).setDisabled(!config.roleUser || !config.roleMuted)));
            } else {
                rows.push(new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('select_optional').setPlaceholder('Canales opcionales...').addChannelTypes(ChannelType.GuildText).setMaxValues(2)));
                rows.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('finish').setLabel('✅ Finalizar Setup').setStyle(ButtonStyle.Success)));
            }
            return rows;
        };

        const message = await interaction.reply({ embeds: [getEmbed()], components: getComponents(), flags: [MessageFlags.Ephemeral] });
        const collector = message.createMessageComponentCollector({ time: 300000 });

        collector.on('collect', async i => {
            if (i.customId === 'select_channels') {
                config.logsChannel = i.values[0];
                config.verifyChannel = i.values[1] || config.verifyChannel;
                config.debugChannel = i.values[2] || config.debugChannel;
            }
            if (i.customId === 'select_roles') {
                config.roleUser = i.values[0];
                config.roleNoVerify = i.values[1] || config.roleNoVerify;
                config.roleMuted = i.values[2] || config.roleMuted;
            }
            if (i.customId === 'select_optional') {
                config.welcomeChannel = i.values[0];
                config.supportChannel = i.values[1] || config.supportChannel;
            }
            if (i.customId === 'next') step++;
            if (i.customId === 'finish') {
                try {
                    await updateGuildSettings(guild.id, config);
                    return i.update({ content: "🎉 **¡Configuración completada con éxito!**", embeds: [], components: [] });
                } catch (err) {
                    // FIX: Usamos interaction.client para evitar el ReferenceError
                    logError(interaction.client, err, "Finalizar Setup Wizard", guild.id);
                    return i.update({ content: "❌ Error al guardar. Revisá MariaDB.", embeds: [], components: [] });
                }
            }
            await i.update({ embeds: [getEmbed()], components: getComponents() });
        });
    }
};