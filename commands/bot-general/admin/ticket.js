const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ChannelType, AttachmentBuilder } = require('discord.js');
const { addTicketCategory, removeTicketCategory, getTicketCategories } = require('../../../utils/ticketDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Gestión del sistema de Tickets')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        // Subcomando: ADD
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Añadir una nueva categoría de tickets')
                .addStringOption(opt => opt.setName('nombre').setDescription('Nombre de la categoría (ej: Soporte Técnico)').setRequired(true))
                .addRoleOption(opt => opt.setName('rol').setDescription('Rol que atenderá estos tickets').setRequired(true))
                .addChannelOption(opt => opt.setName('categoria_discord').setDescription('Categoría de Discord donde se crearán los canales').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
                .addStringOption(opt => opt.setName('emoji').setDescription('Emoji representativo (ej: 🔧)').setRequired(true))
                .addStringOption(opt => opt.setName('descripcion').setDescription('Breve descripción para el menú').setRequired(true))
        )
        // Subcomando: REMOVE
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Eliminar una categoría existente')
                .addStringOption(opt => opt.setName('nombre').setDescription('Nombre exacto de la categoría a borrar').setRequired(true))
        )
        // Subcomando: LIST
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('Listar todas las categorías configuradas')
        )
        // Subcomando: PANEL
        .addSubcommand(sub =>
            sub.setName('panel')
                .setDescription('Enviar el panel de creación de tickets a este canal')
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // --- ADD ---
        if (sub === 'add') {
            const name = interaction.options.getString('nombre');
            const role = interaction.options.getRole('rol');
            const parentCat = interaction.options.getChannel('categoria_discord');
            const emoji = interaction.options.getString('emoji');
            const desc = interaction.options.getString('descripcion');

            const success = await addTicketCategory(guildId, {
                name,
                description: desc,
                emoji,
                roleId: role.id,
                targetCategoryId: parentCat.id
            });

            if (success) {
                return interaction.reply({ content: `✅ Categoría **${name}** creada con éxito.\n> **Rol:** ${role}\n> **Ubicación:** ${parentCat.name}`, ephemeral: true });
            } else {
                return interaction.reply({ content: `❌ Hubo un error al guardar la categoría.`, ephemeral: true });
            }
        }

        // --- REMOVE ---
        if (sub === 'remove') {
            const name = interaction.options.getString('nombre');
            const success = await removeTicketCategory(guildId, name);
            if (success) {
                return interaction.reply({ content: `🗑️ Categoría **${name}** eliminada.`, ephemeral: true });
            } else {
                return interaction.reply({ content: `❌ No se pudo eliminar (quizás no existe).`, ephemeral: true });
            }
        }

        // --- LIST ---
        if (sub === 'list') {
            const categories = await getTicketCategories(guildId);
            if (categories.length === 0) return interaction.reply({ content: "⚠️ No hay categorías configuradas.", ephemeral: true });

            const list = categories.map(c => `**${c.name}** ${c.emoji}\n> Rol: <@&${c.roleId}>\n> Destino: <#${c.targetCategoryId}>`).join('\n\n');
            const embed = new EmbedBuilder().setTitle("📂 Categorías de Tickets").setDescription(list).setColor(0x3498db);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // --- PANEL ---
        if (sub === 'panel') {
            const categories = await getTicketCategories(guildId);
            if (categories.length === 0) return interaction.reply({ content: "⚠️ Primero debes añadir categorías con `/ticket add`.", ephemeral: true });

            const file = new AttachmentBuilder('./assets/logo.png');

            const embed = new EmbedBuilder()
                .setTitle("CENTRO DE SOPORTE | CAPI NETTA RP")
                .setDescription("Selecciona el departamento adecuado para tu consulta en el menú de abajo. \n\n⚠️ **El mal uso de este sistema conlleva sanciones.**")
                .setThumbnail('attachment://logo.png')
                .setColor(0x2ecc71)
                .setFooter({ text: "Sistema de Tickets Automático" });

            const options = categories.map(c => ({
                label: c.name,
                description: c.description.substring(0, 100),
                emoji: c.emoji,
                value: `create_ticket_${c.name}`
            }));

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket_category_select')
                    .setPlaceholder('📥 Selecciona una categoría...')
                    .addOptions(options)
            );

            await interaction.channel.send({ embeds: [embed], components: [row], files: [file] });
            return interaction.reply({ content: "✅ Panel enviado.", ephemeral: true });
        }
    }
};
