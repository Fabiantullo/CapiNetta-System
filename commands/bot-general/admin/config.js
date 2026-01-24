//
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
        .setDescription('Panel Maestro: Gestión segura de MariaDB')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const { guild } = interaction;
        let selectedField = null;

        async function renderPanel() {
            const s = await getGuildSettings(guild.id);
            const embed = new EmbedBuilder()
                .setTitle(`⚙️ Centro de Mandos | ${guild.name}`)
                .setDescription(`Configuración viva. \n**Sistema:** ${s?.isSetup ? '🟢 Operativo' : '🔴 Error de Datos'}`)
                .setColor(s?.isSetup ? 0x2ecc71 : 0xff0000)
                .addFields(
                    { name: '📡 Canales', value: `> **Logs:** ${s?.logsChannel ? `<#${s.logsChannel}>` : '❌'}\n> **Debug:** ${s?.debugChannel ? `<#${s.debugChannel}>` : '❌'}\n> **Verif:** ${s?.verifyChannel ? `<#${s.verifyChannel}>` : '❌'}`, inline: true },
                    { name: '🎭 Roles', value: `> **User:** ${s?.roleUser ? `<@&${s.roleUser}>` : '❌'}\n> **No-Verif:** ${s?.roleNoVerify ? `<@&${s.roleNoVerify}>` : '❌'}\n> **Mute:** ${s?.roleMuted ? `<@&${s.roleMuted}>` : '❌'}`, inline: true },
                    { name: '🚀 Módulos', value: `**Bienvenida:** ${s?.welcomeChannel ? `<#${s.welcomeChannel}>` : '🔘 OFF'}\n**Soporte:** ${s?.supportChannel ? `<#${s.supportChannel}>` : '🔘 OFF'}`, inline: false }
                );

            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('cat_select').setPlaceholder('Elegí qué sección editar...').addOptions([
                    { label: 'Canales', value: 'cat_channels', emoji: '📡' },
                    { label: 'Roles', value: 'cat_roles', emoji: '🎭' },
                    { label: 'Módulos', value: 'cat_modules', emoji: '🚀' }
                ])
            );

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('refresh').setLabel('🔄').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('close').setLabel('Cerrar Panel').setStyle(ButtonStyle.Danger)
            );

            return { embeds: [embed], components: [menu, buttons], content: null };
        }

        const response = await interaction.reply({ ...(await renderPanel()), flags: [MessageFlags.Ephemeral] });
        const collector = response.createMessageComponentCollector({ time: 600000 });

        collector.on('collect', async i => {
            if (i.customId === 'close') {
                try { await interaction.deleteReply(); }
                catch (e) { await interaction.editReply({ content: 'Panel cerrado.', embeds: [], components: [] }); }
                return;
            }

            if (i.customId === 'refresh') return i.update(await renderPanel());

            if (i.customId === 'cat_select') {
                const cat = i.values[0];
                const opts = cat === 'cat_channels' ? [{ label: 'Logs', value: 'logsChannel' }, { label: 'Debug', value: 'debugChannel' }, { label: 'Verif', value: 'verifyChannel' }] :
                    cat === 'cat_roles' ? [{ label: 'User', value: 'roleUser' }, { label: 'No-Verif', value: 'roleNoVerify' }, { label: 'Mute', value: 'roleMuted' }] :
                        [{ label: 'Bienvenida', value: 'welcomeChannel' }, { label: 'Soporte', value: 'supportChannel' }];

                const sub = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder().setCustomId('field_select').setPlaceholder('¿Qué campo querés cambiar?').addOptions(opts)
                );
                return i.update({ components: [sub] });
            }

            if (i.customId === 'field_select') {
                selectedField = i.values[0];
                const selector = new ActionRowBuilder().addComponents(
                    selectedField.startsWith('role') ? new RoleSelectMenuBuilder().setCustomId('save')
                        : new ChannelSelectMenuBuilder().setCustomId('save').addChannelTypes(ChannelType.GuildText)
                );
                return i.update({ content: `Seleccioná el nuevo valor para **${selectedField}**`, components: [selector] });
            }

            if (i.customId === 'save') {
                await i.update({ content: `💾 Guardando en MariaDB...`, components: [] });

                await updateGuildSettings(guild.id, { [selectedField]: i.values[0] });

                setTimeout(async () => {
                    await interaction.editReply(await renderPanel());
                }, 1000);
            }
        });
    },
};