const {
    SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits,
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    StringSelectMenuBuilder, ComponentType, MessageFlags
} = require('discord.js');
const { getGuildSettings } = require('../../../utils/dataHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Panel maestro de configuración: Gestioná canales, roles y módulos')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const { guild } = interaction;

        async function createMainPanel() {
            const s = await getGuildSettings(guild.id);
            if (!s) return { content: "⚠️ No hay datos. Usá `/setup` por primera vez.", ephemeral: true };

            const embed = new EmbedBuilder()
                .setTitle(`⚙️ Centro de Mandos | ${guild.name}`)
                .setDescription(`Aquí podés ver y modificar toda la infraestructura del bot. \n**Estado del Sistema:** ${s.isSetup ? '🟢 Operativo' : '🟡 Configuración Pendiente'}`)
                .setColor(s.isSetup ? 0x2ecc71 : 0xf1c40f)
                .setThumbnail(guild.iconURL({ dynamic: true }))
                .addFields(
                    {
                        name: '📡 Canales Críticos', value: [
                            `> **Logs:** ${s.logsChannel ? `<#${s.logsChannel}>` : '❌ *Sin asignar*'}`,
                            `> **Debug:** ${s.debugChannel ? `<#${s.debugChannel}>` : '❌ *Sin asignar*'}`,
                            `> **Verificación:** ${s.verifyChannel ? `<#${s.verifyChannel}>` : '❌ *Sin asignar*'}`
                        ].join('\n'), inline: true
                    },
                    {
                        name: '🎭 Jerarquía de Roles', value: [
                            `> **Verificado:** ${s.roleUser ? `<@&${s.roleUser}>` : '❌ *Sin asignar*'}`,
                            `> **Sin Verificar:** ${s.roleNoVerify ? `<@&${s.roleNoVerify}>` : '❌ *Sin asignar*'}`,
                            `> **Muteado:** ${s.roleMuted ? `<@&${s.roleMuted}>` : '❌ *Sin asignar*'}`
                        ].join('\n'), inline: true
                    },
                    {
                        name: '🚀 Módulos Especializados', value: [
                            `**Welcome Canvas:** ${s.welcomeChannel ? `<#${s.welcomeChannel}> (Activo ✅)` : '🔘 *Desactivado*'}`,
                            `**Soporte/Aislados:** ${s.supportChannel ? `<#${s.supportChannel}> (Activo ✅)` : '🔘 *Desactivado*'}`
                        ].join('\n'), inline: false
                    }
                )
                .setFooter({ text: `ID del Servidor: ${guild.id}` })
                .setTimestamp();

            // Menú para elegir qué editar directamente
            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('edit_category')
                    .setPlaceholder('🎯 ¿Qué sección querés modificar?')
                    .addOptions([
                        { label: 'Canales de Sistema', description: 'Logs, Debug y Verificación', value: 'cat_channels', emoji: '📡' },
                        { label: 'Gestión de Roles', description: 'Usuario, No-Verificado y Mute', value: 'cat_roles', emoji: '🎭' },
                        { label: 'Módulos Avanzados', description: 'Bienvenidas y Soporte', value: 'cat_modules', emoji: '🚀' },
                    ])
            );

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('refresh_config').setLabel('Refrescar Datos').setStyle(ButtonStyle.Secondary).setEmoji('🔄'),
                new ButtonBuilder().setCustomId('full_wizard').setLabel('Asistente Completo').setStyle(ButtonStyle.Primary).setEmoji('🪄')
            );

            return { embeds: [embed], components: [menu, buttons], flags: [MessageFlags.Ephemeral] };
        }

        const initialPanel = await createMainPanel();
        const response = await interaction.reply(initialPanel);

        const collector = response.createMessageComponentCollector({ time: 300000 });

        collector.on('collect', async i => {
            if (i.customId === 'refresh_config') {
                const refreshed = await createMainPanel();
                return i.update(refreshed);
            }

            if (i.customId === 'edit_category') {
                const selection = i.values[0];
                let msg = "";
                if (selection === 'cat_channels') msg = "Has seleccionado **Canales**. Iniciando asistente de canales...";
                if (selection === 'cat_roles') msg = "Has seleccionado **Roles**. Iniciando asistente de roles...";
                if (selection === 'cat_modules') msg = "Has seleccionado **Módulos**. Iniciando configuración de Bienvenida/Soporte...";

                await i.reply({ content: `🛠️ **Modo Edición:** ${msg} \n*(Por ahora, usá /setup mientras termino de linkear las funciones directas)*`, flags: [MessageFlags.Ephemeral] });
            }

            if (i.customId === 'full_wizard') {
                await i.reply({ content: "🚀 **Lanzando Asistente...** Por seguridad y orden, usá el comando `/setup` para iniciar el Wizard interactivo completo.", flags: [MessageFlags.Ephemeral] });
            }
        });
    },
};