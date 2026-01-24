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
        .setDescription('Dashboard Maestro: Edición en tiempo real de MariaDB')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const { guild } = interaction;
        let pendingUpdate = { field: null, category: null };

        // 1. GENERADOR DE PANEL PRINCIPAL
        async function createMainPanel() {
            const s = await getGuildSettings(guild.id);
            const embed = new EmbedBuilder()
                .setTitle(`⚙️ Centro de Mandos | ${guild.name}`)
                .setDescription(`Configuración activa. \n**Sistema:** ${s?.isSetup ? '🟢 Operativo' : '🟡 Configuración Pendiente'}`)
                .setColor(s?.isSetup ? 0x2ecc71 : 0xf1c40f)
                .setThumbnail(guild.iconURL({ dynamic: true }))
                .addFields(
                    {
                        name: '📡 Canales', value: [
                            `> **Logs:** ${s?.logsChannel ? `<#${s.logsChannel}>` : '❌'}`,
                            `> **Debug:** ${s?.debugChannel ? `<#${s.debugChannel}>` : '❌'}`,
                            `> **Verificación:** ${s?.verifyChannel ? `<#${s.verifyChannel}>` : '❌'}`
                        ].join('\n'), inline: true
                    },
                    {
                        name: '🎭 Roles', value: [
                            `> **Usuario:** ${s?.roleUser ? `<@&${s.roleUser}>` : '❌'}`,
                            `> **Sin Verificar:** ${s?.roleNoVerify ? `<@&${s.roleNoVerify}>` : '❌'}`,
                            `> **Muteado:** ${s?.roleMuted ? `<@&${s.roleMuted}>` : '❌'}`
                        ].join('\n'), inline: true
                    },
                    {
                        name: '🚀 Módulos', value: [
                            `**Bienvenida:** ${s?.welcomeChannel ? `<#${s.welcomeChannel}> (✅)` : '🔘 *OFF*'}`,
                            `**Soporte:** ${s?.supportChannel ? `<#${s.supportChannel}> (✅)` : '🔘 *OFF*'}`
                        ].join('\n'), inline: false
                    }
                )
                .setFooter({ text: `ID: ${guild.id} • Capi Netta RP` });

            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('edit_category')
                    .setPlaceholder('🎯 Seleccioná qué sección editar...')
                    .addOptions([
                        { label: 'Canales (Logs/Debug/Verif)', value: 'cat_channels', emoji: '📡' },
                        { label: 'Roles (User/No-Verif/Mute)', value: 'cat_roles', emoji: '🎭' },
                        { label: 'Módulos (Welcome/Support)', value: 'cat_modules', emoji: '🚀' },
                    ])
            );

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('refresh_config').setLabel('Refrescar').setStyle(ButtonStyle.Secondary).setEmoji('🔄'),
                new ButtonBuilder().setCustomId('close_panel').setLabel('Cerrar').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );

            return { embeds: [embed], components: [menu, buttons] };
        }

        const response = await interaction.reply({ ...(await createMainPanel()), flags: [MessageFlags.Ephemeral] });
        const collector = response.createMessageComponentCollector({ time: 600000 });

        collector.on('collect', async i => {
            // REFRESCAR O CERRAR
            if (i.customId === 'refresh_config') return i.update(await createMainPanel());
            if (i.customId === 'close_panel') return i.deleteReply();

            // PASO 1: SELECCIONAR CATEGORÍA
            if (i.customId === 'edit_category') {
                const category = i.values[0];
                let fieldOptions = [];

                if (category === 'cat_channels') {
                    fieldOptions = [
                        { label: 'Canal de Logs', value: 'logsChannel', emoji: '📄' },
                        { label: 'Canal de Debug/Errores', value: 'debugChannel', emoji: '🛠️' },
                        { label: 'Canal de Verificación', value: 'verifyChannel', emoji: '✅' }
                    ];
                } else if (category === 'cat_roles') {
                    fieldOptions = [
                        { label: 'Rol de Usuario', value: 'roleUser', emoji: '👤' },
                        { label: 'Rol Sin Verificar', value: 'roleNoVerify', emoji: '🔘' },
                        { label: 'Rol Muteado', value: 'roleMuted', emoji: '🔇' }
                    ];
                } else if (category === 'cat_modules') {
                    fieldOptions = [
                        { label: 'Canal de Bienvenida (Canvas)', value: 'welcomeChannel', emoji: '🎨' },
                        { label: 'Canal de Soporte/Aislado', value: 'supportChannel', emoji: '💬' }
                    ];
                }

                const fieldMenu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('select_field')
                        .setPlaceholder('¿Específicamente qué campo querés cambiar?')
                        .addOptions(fieldOptions)
                );

                return i.update({ content: `🛠️ **Paso 2:** Elegí el campo a modificar de esa sección.`, components: [fieldMenu] });
            }

            // PASO 2: SELECCIONAR CAMPO ESPECÍFICO
            if (i.customId === 'select_field') {
                pendingUpdate.field = i.values[0];
                const isRole = pendingUpdate.field.startsWith('role');

                const finalSelector = new ActionRowBuilder().addComponents(
                    isRole ? new RoleSelectMenuBuilder().setCustomId('save_value').setPlaceholder(`Seleccioná el nuevo ROL para ${pendingUpdate.field}`)
                        : new ChannelSelectMenuBuilder().setCustomId('save_value').setPlaceholder(`Seleccioná el nuevo CANAL para ${pendingUpdate.field}`).addChannelTypes(ChannelType.GuildText)
                );

                return i.update({ content: `📥 **Paso 3:** Seleccioná el nuevo valor para \`${pendingUpdate.field}\`.`, components: [finalSelector] });
            }

            // PASO 3: GUARDAR EN MARIADB Y REFRESCAR
            if (i.customId === 'save_value') {
                const newValue = i.values[0];
                await i.update({ content: `💾 Guardando \`${pendingUpdate.field}\` en MariaDB...`, components: [] });

                // Actualizamos la base de datos
                const updateData = {};
                updateData[pendingUpdate.field] = newValue;
                await updateGuildSettings(guild.id, updateData);

                // Esperamos un toque para que la DB procese y refrescamos el panel
                setTimeout(async () => {
                    await interaction.editReply({ content: null, ...(await createMainPanel()) });
                }, 1000);
            }
        });
    },
};