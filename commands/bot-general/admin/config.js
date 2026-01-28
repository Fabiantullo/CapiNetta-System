/**
 * @file config.js
 * @description Dashboard Maestro interactivo.
 * Muestra el estado actual de la configuración del servidor y permite editar campos individuales
 * mediante un sistema de menús desplegables (SelectMenus).
 */

const {
    SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits,
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    StringSelectMenuBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder,
    ComponentType, MessageFlags, ChannelType
} = require('discord.js');
const { getGuildSettings, updateGuildSettings } = require('../../../utils/dataHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Dashboard Maestro: Gestión total de Capi Netta RP')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const { guild } = interaction;
        let selectedField = null; // Campo que se está editando actualmente

        /**
         * Renderiza el Panel Principal con la info actual de DB.
         */
        async function renderFullPanel() {
            const s = await getGuildSettings(guild.id);
            const embed = new EmbedBuilder()
                .setTitle(`⚙️ Centro de Mandos | ${guild.name}`)
                .setDescription(`Configuración viva en **MariaDB**. \n**Sistema:** ${s?.isSetup ? '🟢 Operativo' : '🔴 Configuración Pendiente'}`)
                .setColor(s?.isSetup ? 0x2ecc71 : 0xf1c40f)
                .setThumbnail(guild.iconURL({ dynamic: true }))
                .addFields(
                    { name: '📡 Canales de Sistema', value: `> **Logs:** ${s?.logsChannel ? `<#${s.logsChannel}>` : '❌'}\n> **Debug:** ${s?.debugChannel ? `<#${s.debugChannel}>` : '❌'}\n> **Verificación:** ${s?.verifyChannel ? `<#${s.verifyChannel}>` : '❌'}`, inline: true },
                    { name: '🎭 Gestión de Roles', value: `> **Usuario:** ${s?.roleUser ? `<@&${s.roleUser}>` : '❌'}\n> **Sin Verificar:** ${s?.roleNoVerify ? `<@&${s.roleNoVerify}>` : '❌'}\n> **Muteado:** ${s?.roleMuted ? `<@&${s.roleMuted}>` : '❌'}`, inline: true },
                    { name: '� Roles de Staff', value: (() => { try { const roles = s?.staffRoles ? JSON.parse(s.staffRoles) : []; return roles.length > 0 ? roles.map(r => `<@&${r}>`).join(' ') : '🔘 *Usando permisos*'; } catch { return '❌'; } })(), inline: false },
                    { name: '�🚀 Módulos Especializados', value: `**Welcome Canvas:** ${s?.welcomeChannel ? `<#${s.welcomeChannel}> (✅)` : '🔘 *OFF*'}\n**Soporte/Aislados:** ${s?.supportChannel ? `<#${s.supportChannel}> (✅)` : '🔘 *OFF*'}`, inline: false }
                )
                .setFooter({ text: "Capi Netta System • Gestión de Alta Eficiencia" });

            // Menú de Categorías (Primer Nivel)
            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('cat_select').setPlaceholder('🎯 Elegí qué sección editar...').addOptions([
                    { label: 'Canales de Sistema', value: 'cat_channels', emoji: '📡' },
                    { label: 'Gestión de Roles', value: 'cat_roles', emoji: '🎭' },
                    { label: 'Roles de Staff', value: 'cat_staff', emoji: '👮' },
                    { label: 'Módulos Avanzados', value: 'cat_modules', emoji: '🚀' }
                ])
            );

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('refresh').setLabel('🔄').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('close_panel').setLabel('Cerrar Panel').setStyle(ButtonStyle.Danger)
            );

            return { embeds: [embed], components: [menu, buttons], content: null };
        }

        const response = await interaction.reply({ ...(await renderFullPanel()), flags: [MessageFlags.Ephemeral] });
        const collector = response.createMessageComponentCollector({ time: 600000 }); // 10 Minutos

        collector.on('collect', async i => {
            if (i.customId === 'close_panel') {
                return i.update({ content: '🔒 Panel cerrado correctamente.', embeds: [], components: [] });
            }

            if (i.customId === 'refresh') return i.update(await renderFullPanel());

            // Nivel 1: Selección de Categoría -> Muestra sub-menú de campos
            if (i.customId === 'cat_select') {
                const cat = i.values[0];
                
                // Caso especial: Staff Roles (múltiple selección)
                if (cat === 'cat_staff') {
                    const selector = new ActionRowBuilder().addComponents(
                        new RoleSelectMenuBuilder().setCustomId('save_staff_roles').setPlaceholder('Seleccioná roles de staff...').setMinValues(0).setMaxValues(10)
                    );
                    return i.update({ content: `👮 Seleccioná todos los roles que sean Staff (para estadísticas)`, components: [selector] });
                }
                
                const opts = cat === 'cat_channels' ? [
                    { label: 'Logs', value: 'logsChannel' }, { label: 'Debug', value: 'debugChannel' }, { label: 'Verif', value: 'verifyChannel' }
                ] : cat === 'cat_roles' ? [
                    { label: 'User', value: 'roleUser' }, { label: 'No-Verif', value: 'roleNoVerify' }, { label: 'Mute', value: 'roleMuted' }
                ] : [
                    { label: 'Bienvenida', value: 'welcomeChannel' }, { label: 'Soporte', value: 'supportChannel' }
                ];

                const sub = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder().setCustomId('field_select').setPlaceholder('¿Qué campo querés cambiar?').addOptions(opts)
                );
                return i.update({ components: [sub] });
            }

            // Nivel 2: Selección de Campo -> Muestra selector de Role/Channel para editar
            if (i.customId === 'field_select') {
                selectedField = i.values[0];
                const selector = new ActionRowBuilder().addComponents(
                    selectedField.startsWith('role') ? new RoleSelectMenuBuilder().setCustomId('save')
                        : new ChannelSelectMenuBuilder().setCustomId('save').addChannelTypes(ChannelType.GuildText)
                );
                return i.update({ content: `🛠️ Seleccioná el nuevo valor para **${selectedField}**`, components: [selector] });
            }

            // Guardar Staff Roles (múltiples)
            if (i.customId === 'save_staff_roles') {
                await i.update({ content: `💾 Guardando roles de staff...`, components: [] });
                try {
                    const staffRolesJson = i.values.length > 0 ? JSON.stringify(i.values) : null;
                    await updateGuildSettings(guild.id, { staffRoles: staffRolesJson });
                    setTimeout(async () => {
                        await interaction.editReply(await renderFullPanel());
                    }, 1000);
                } catch (err) {
                    await interaction.editReply({ content: "❌ Error al guardar. Revisá la consola." });
                }
                return;
            }

            // Nivel 3: Guardar Valor (Acción Final)
            if (i.customId === 'save') {
                await i.update({ content: `💾 Guardando en MariaDB...`, components: [] });
                try {
                    await updateGuildSettings(guild.id, { [selectedField]: i.values[0] });
                    // Volver al panel principal tras guardar
                    setTimeout(async () => {
                        await interaction.editReply(await renderFullPanel());
                    }, 1000);
                } catch (err) {
                    await interaction.editReply({ content: "❌ Error al guardar. Revisá la consola." });
                }
            }
        });
    },
};