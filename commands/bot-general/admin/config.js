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
        .setDescription('Dashboard Maestro: Edición segura de MariaDB')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const { guild } = interaction;
        let session = { field: null };

        async function createMainPanel() {
            const s = await getGuildSettings(guild.id);
            const embed = new EmbedBuilder()
                .setTitle(`⚙️ Centro de Mandos | ${guild.name}`)
                .setDescription(`Configuración viva. \n**Sistema:** ${s?.isSetup ? '🟢 Operativo' : '🟡 Pendiente'}`)
                .setColor(s?.isSetup ? 0x2ecc71 : 0xf1c40f)
                .addFields(
                    { name: '📡 Canales', value: `> **Logs:** ${s?.logsChannel ? `<#${s.logsChannel}>` : '❌'}\n> **Debug:** ${s?.debugChannel ? `<#${s.debugChannel}>` : '❌'}\n> **Verif:** ${s?.verifyChannel ? `<#${s.verifyChannel}>` : '❌'}`, inline: true },
                    { name: '🎭 Roles', value: `> **User:** ${s?.roleUser ? `<@&${s.roleUser}>` : '❌'}\n> **No-Verif:** ${s?.roleNoVerify ? `<@&${s.roleNoVerify}>` : '❌'}\n> **Mute:** ${s?.roleMuted ? `<@&${s.roleMuted}>` : '❌'}`, inline: true },
                    { name: '🚀 Módulos', value: `**Bienvenida:** ${s?.welcomeChannel ? `<#${s.welcomeChannel}>` : '🔘 OFF'}\n**Soporte:** ${s?.supportChannel ? `<#${s.supportChannel}>` : '🔘 OFF'}`, inline: false }
                )
                .setFooter({ text: "Capi Netta System" });

            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('edit_category')
                    .setPlaceholder('🎯 Elegí qué sección editar...')
                    .addOptions([
                        { label: 'Canales', value: 'cat_channels', emoji: '📡' },
                        { label: 'Roles', value: 'cat_roles', emoji: '🎭' },
                        { label: 'Módulos', value: 'cat_modules', emoji: '🚀' },
                    ])
            );

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('refresh_config').setLabel('🔄').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('close_config').setLabel('Cerrar Panel').setStyle(ButtonStyle.Danger) //
            );

            return { embeds: [embed], components: [menu, buttons] };
        }

        const response = await interaction.reply({ ...(await createMainPanel()), flags: [MessageFlags.Ephemeral] });
        const collector = response.createMessageComponentCollector({ time: 600000 });

        collector.on('collect', async i => {
            if (i.customId === 'close_config') {
                return await interaction.deleteReply().catch(() => { });
            }

            if (i.customId === 'refresh_config') return i.update(await createMainPanel());

            if (i.customId === 'edit_category') {
                const category = i.values[0];
                const options = category === 'cat_channels' ? [
                    { label: 'Logs', value: 'logsChannel' }, { label: 'Debug', value: 'debugChannel' }, { label: 'Verificación', value: 'verifyChannel' }
                ] : category === 'cat_roles' ? [
                    { label: 'Usuario', value: 'roleUser' }, { label: 'Sin Verificar', value: 'roleNoVerify' }, { label: 'Muteado', value: 'roleMuted' }
                ] : [
                    { label: 'Bienvenida', value: 'welcomeChannel' }, { label: 'Soporte', value: 'supportChannel' }
                ];

                const subMenu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder().setCustomId('select_field').setPlaceholder('¿Qué campo específico?').addOptions(options)
                );
                return i.update({ components: [subMenu] });
            }

            if (i.customId === 'select_field') {
                session.field = i.values[0];
                const isRole = session.field.startsWith('role');
                const selector = new ActionRowBuilder().addComponents(
                    isRole ? new RoleSelectMenuBuilder().setCustomId('save_value')
                        : new ChannelSelectMenuBuilder().setCustomId('save_value').addChannelTypes(ChannelType.GuildText)
                );
                return i.update({ content: `📥 Seleccioná el nuevo valor para **${session.field}**`, components: [selector] });
            }

            if (i.customId === 'save_value') {
                const newValue = i.values[0];
                await i.update({ content: `💾 Guardando...`, components: [] });

                await updateGuildSettings(guild.id, { [session.field]: newValue });

                setTimeout(async () => {
                    await interaction.editReply({ content: null, ...(await createMainPanel()) });
                }, 1000);
            }
        });
    },
};