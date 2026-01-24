/**
 * @file ticket.js
 * @description Comando principal de administración de Tickets (/ticket).
 * Permite configurar categorías, roles, logs y enviar el Panel de Creación.
 */

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, AttachmentBuilder } = require('discord.js');
const { addTicketCategory, removeTicketCategory, getTicketCategories, addRoleToCategory } = require('../../../utils/ticketDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Gestión del sistema de Tickets')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        // --- SUBCOMANDOS DE CONFIGURACIÓN ---

        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Añadir una nueva categoría de tickets')
                .addStringOption(opt => opt.setName('nombre').setDescription('Nombre de la categoría (ej: Soporte Técnico)').setRequired(true))
                .addRoleOption(opt => opt.setName('rol').setDescription('Rol PRINCIPAL que atenderá estos tickets').setRequired(true))
                .addChannelOption(opt => opt.setName('categoria_discord').setDescription('Categoría de Discord donde se crearán los canales').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
                .addStringOption(opt => opt.setName('emoji').setDescription('Emoji representativo (ej: 🔧)').setRequired(true))
                .addStringOption(opt => opt.setName('descripcion').setDescription('Breve descripción para el menú').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('addrole')
                .setDescription('Agregar un rol EXTRA para ver tickets de una categoría')
                .addStringOption(opt => opt.setName('categoria').setDescription('Nombre exacto de la categoría').setRequired(true))
                .addRoleOption(opt => opt.setName('rol').setDescription('Rol extra a añadir').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Eliminar una categoría existente')
                .addStringOption(opt => opt.setName('nombre').setDescription('Nombre exacto de la categoría a borrar').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('Listar todas las categorías configuradas')
        )
        .addSubcommand(sub =>
            sub.setName('panel')
                .setDescription('Enviar el panel de creación de tickets a este canal')
        )
        .addSubcommand(sub =>
            sub.setName('setlogs')
                .setDescription('Configurar el canal donde se enviarán los transcripts')
                .addChannelOption(opt => opt.setName('canal').setDescription('Canal de Logs de Tickets').addChannelTypes(ChannelType.GuildText).setRequired(true))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // 1. CONFIGURACIÓN DE LOGS
        if (sub === 'setlogs') {
            const channel = interaction.options.getChannel('canal');
            const { updateGuildSettings } = require('../../../utils/dataHandler');

            try {
                await updateGuildSettings(guildId, { ticketLogsChannel: channel.id });
                return interaction.reply({ content: `✅ Canal de transcripts configurado en ${channel}.`, ephemeral: true });
            } catch (err) {
                return interaction.reply({ content: "❌ Error guardando la configuración.", ephemeral: true });
            }
        }

        // 2. AÑADIR CATEGORÍA
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
                roleId: role.id, // Se guarda como string inicialmente (o el primer ID si fuésemos a array directo, pero DB espera String)
                targetCategoryId: parentCat.id
            });

            if (success) {
                return interaction.reply({ content: `✅ Categoría **${name}** creada con éxito.\n> **Rol:** ${role}\n> **Ubicación:** ${parentCat.name}`, ephemeral: true });
            } else {
                return interaction.reply({ content: `❌ Hubo un error al guardar la categoría.`, ephemeral: true });
            }
        }

        // 3. AÑADIR ROL SECUNDARIO
        if (sub === 'addrole') {
            const name = interaction.options.getString('categoria');
            const role = interaction.options.getRole('rol');

            const success = await addRoleToCategory(guildId, name, role.id);
            if (success) {
                return interaction.reply({ content: `✅ Rol **${role.name}** agregado a la categoría **${name}**.`, ephemeral: true });
            } else {
                return interaction.reply({ content: `❌ No se encontró la categoría o hubo un error DB.`, ephemeral: true });
            }
        }

        // 4. ELIMINAR CATEGORÍA
        if (sub === 'remove') {
            const name = interaction.options.getString('nombre');
            const success = await removeTicketCategory(guildId, name);
            if (success) {
                return interaction.reply({ content: `🗑️ Categoría **${name}** eliminada.`, ephemeral: true });
            } else {
                return interaction.reply({ content: `❌ No se pudo eliminar (quizás no existe).`, ephemeral: true });
            }
        }

        // 5. LISTAR CATEGORÍAS
        if (sub === 'list') {
            const categories = await getTicketCategories(guildId);
            if (categories.length === 0) return interaction.reply({ content: "⚠️ No hay categorías configuradas.", ephemeral: true });

            const list = categories.map(c => {
                // Parseo visual de roles (puede ser ID o Array JSON)
                let rolesDisplay = c.roleId;
                if (c.roleId.startsWith('[')) {
                    try {
                        const roles = JSON.parse(c.roleId);
                        rolesDisplay = roles.map(r => `<@&${r}>`).join(', ');
                    } catch (e) { }
                } else {
                    rolesDisplay = `<@&${c.roleId}>`;
                }
                return `**${c.name}** ${c.emoji}\n> Roles: ${rolesDisplay}\n> Destino: <#${c.targetCategoryId}>`;
            }).join('\n\n');

            const embed = new EmbedBuilder().setTitle("📂 Categorías de Tickets").setDescription(list).setColor(0x3498db);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // 6. ENVIAR PANEL (Grid de Botones)
        if (sub === 'panel') {
            const categories = await getTicketCategories(guildId);
            if (categories.length === 0) return interaction.reply({ content: "⚠️ Primero debes añadir categorías con `/ticket add`.", ephemeral: true });

            const file = new AttachmentBuilder('./assets/logo.png');

            // 1. Construir Descripción Rica
            const description = [
                "**¡Bienvenido al sistema de soporte oficial de Capi Netta RP!**",
                "Selecciona la opción que mejor se adapte a tu consulta para ser atendido por el staff correspondiente.\n"
            ];

            categories.forEach(c => {
                description.push(`> **${c.emoji} ${c.name}**\n> *${c.description}*\n`);
            });

            description.push("⚠️ **El mal uso de este sistema conlleva sanciones.**");

            const embed = new EmbedBuilder()
                .setTitle("CENTRO DE SOPORTE | CAPI NETTA RP")
                .setDescription(description.join('\n'))
                .setThumbnail('attachment://logo.png')
                .setColor(0x2ecc71)
                .setFooter({ text: "Sistema de Tickets Automático" });

            // 2. Construir Grid de Botones (Max 5 por fila)
            const rows = [];
            let currentRow = new ActionRowBuilder();

            categories.forEach((c, index) => {
                const btn = new ButtonBuilder()
                    .setCustomId(`create_ticket_${c.name}`)
                    .setLabel(c.name)
                    .setEmoji(c.emoji)
                    .setStyle(ButtonStyle.Secondary);

                // Lógica de salto de fila
                if (currentRow.components.length >= 5) {
                    rows.push(currentRow);
                    currentRow = new ActionRowBuilder();
                }

                currentRow.addComponents(btn);
            });

            if (currentRow.components.length > 0) rows.push(currentRow);

            await interaction.channel.send({ embeds: [embed], components: rows, files: [file] });
            return interaction.reply({ content: "✅ Panel (Modo Botones) enviado.", ephemeral: true });
        }
    }
};
