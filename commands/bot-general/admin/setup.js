const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ComponentType,
    MessageFlags
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

        let config = {
            logsChannel: null, verifyChannel: null, debugChannel: null,
            roleUser: null, roleNoVerify: null, roleMuted: null,
            welcomeChannel: null, supportChannel: null,
            isSetup: 1
        };

        let step = 1;

        const getEmbed = () => {
            const embed = new EmbedBuilder()
                .setTitle("🛠️ Asistente de Configuración | Capi Netta RP")
                .setColor(0x3498db)
                .setTimestamp();

            if (step === 1) {
                embed.setDescription("### Paso 1: Canales del Sistema\nSeleccioná o creá los canales para **Logs**, **Verificación** y **Errores (Debug)**.");
                embed.addFields(
                    { name: "📍 Logs:", value: config.logs ? `<#${config.logs}>` : "❌ *No seleccionado*", inline: true },
                    { name: "✅ Verificación:", value: config.verify ? `<#${config.verify}>` : "❌ *No seleccionado*", inline: true },
                    { name: "🚨 Debug:", value: config.debug ? `<#${config.debug}>` : "❌ *No seleccionado*", inline: true }
                );
            } else if (step === 2) {
                embed.setDescription("### Paso 2: Gestión de Roles\nConfigurá los roles para usuarios verificados, nuevos ingresos y aislados.");
                embed.addFields(
                    { name: "👤 Usuario:", value: config.rUser ? `<@&${config.rUser}>` : "❌ *No seleccionado*", inline: true },
                    { name: "❓ Sin Verificar:", value: config.rNoVerify ? `<@&${config.rNoVerify}>` : "❌ *No seleccionado*", inline: true },
                    { name: "🔇 Muteado:", value: config.rMuted ? `<@&${config.rMuted}>` : "❌ *No seleccionado*", inline: true }
                );
            } else {
                embed.setDescription("### Paso 3: Módulos Opcionales\nConfigurá los canales de bienvenida y el área de soporte para aislados.");
                embed.addFields(
                    { name: "👋 Bienvenida:", value: config.welcome ? `<#${config.welcome}>` : "🔘 *Opcional*", inline: true },
                    { name: "💬 Soporte:", value: config.support ? `<#${config.support}>` : "🔘 *Opcional*", inline: true }
                );
            }
            return embed;
        };

        const getComponents = () => {
            const rows = [];

            if (step === 1) {
                const select = new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('select_channels')
                        .setPlaceholder('Seleccionar canales existentes...')
                        .addChannelTypes(ChannelType.GuildText)
                        .setMaxValues(3)
                );
                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('auto_channels').setLabel('✨ Crear canales por mí').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('next').setLabel('Siguiente ➡️').setStyle(ButtonStyle.Primary).setDisabled(!config.logs || !config.verify)
                );
                rows.push(select, buttons);
            } else if (step === 2) {
                const select = new ActionRowBuilder().addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId('select_roles')
                        .setPlaceholder('Seleccionar roles existentes...')
                        .setMaxValues(3)
                );
                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('auto_roles').setLabel('🎭 Crear roles por mí').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('next').setLabel('Siguiente ➡️').setStyle(ButtonStyle.Primary).setDisabled(!config.rUser || !config.rMuted)
                );
                rows.push(select, buttons);
            } else {
                const select = new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('select_optional')
                        .setPlaceholder('Seleccionar canales opcionales...')
                        .addChannelTypes(ChannelType.GuildText)
                        .setMaxValues(2)
                );
                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('auto_optional').setLabel('💬 Crear canal Soporte').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('finish').setLabel('✅ Finalizar Setup').setStyle(ButtonStyle.Success)
                );
                rows.push(select, buttons);
            }
            return rows;
        };

        const message = await interaction.reply({
            embeds: [getEmbed()],
            components: getComponents(),
            flags: [MessageFlags.Ephemeral]
        });

        const collector = message.createMessageComponentCollector({ time: 300000 });

        collector.on('collect', async i => {
            if (i.customId === 'select_channels') {
                config.logs = i.values[0];
                config.verify = i.values[1] || config.verify;
                config.debug = i.values[2] || config.debug;
            }

            if (i.customId === 'auto_channels') {
                const logCh = await guild.channels.create({ name: '📂-logs-sistema', type: ChannelType.GuildText });
                const verCh = await guild.channels.create({ name: '✅-verificacion', type: ChannelType.GuildText });
                const debCh = await guild.channels.create({ name: '🚨-debug-errors', type: ChannelType.GuildText });
                config.logs = logCh.id;
                config.verify = verCh.id;
                config.debug = debCh.id;
            }

            if (i.customId === 'select_roles') {
                config.rUser = i.values[0];
                config.rNoVerify = i.values[1] || config.rNoVerify;
                config.rMuted = i.values[2] || config.rMuted;
            }

            if (i.customId === 'auto_roles') {
                const userR = await guild.roles.create({ name: '👤 | Usuario', color: 0x2ecc71, reason: 'Setup Capi Netta' });
                const mutedR = await guild.roles.create({ name: '🔇 | Muteado', color: 0x7f8c8d, reason: 'Setup Capi Netta' });
                config.rUser = userR.id;
                config.rMuted = mutedR.id;
            }

            if (i.customId === 'select_optional') {
                config.welcome = i.values[0];
                config.support = i.values[1] || config.support;
            }

            if (i.customId === 'auto_optional') {
                const supCh = await guild.channels.create({
                    name: '💬-soporte-aislamiento',
                    type: ChannelType.GuildText,
                    permissionOverwrites: [{ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }]
                });
                config.support = supCh.id;
            }

            if (i.customId === 'next') step++;

            if (i.customId === 'finish') {
                try {
                    await updateGuildSettings(guild.id, config);
                    await i.update({ content: "🎉 **¡Configuración completada con éxito!** La base de datos ha sido actualizada.", embeds: [], components: [] });
                    return collector.stop();
                } catch (err) {
                    logError(client, err, "Finalizar Setup Wizard", guild.id);
                    return i.update({ content: "❌ Error crítico al guardar en la base de datos." });
                }
            }

            await i.update({ embeds: [getEmbed()], components: getComponents() });
        });
    }
};