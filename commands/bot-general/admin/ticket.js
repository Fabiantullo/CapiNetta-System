/**
 * @file ticket.js
 * @description Comando principal de administración de Tickets (/ticket).
 * Permite configurar categorías, roles, logs y enviar el Panel de Creación.
 */

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, AttachmentBuilder, MessageFlags } = require('discord.js');
const { addTicketCategory, removeTicketCategory, getTicketCategories, addRoleToCategory, updateTicketCategory, getTicketMetrics } = require('../../../utils/ticketDB');

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
                .addRoleOption(opt => opt.setName('rol_extra_1').setDescription('Rol adicional opcional (ej: Admin)').setRequired(false))
                .addRoleOption(opt => opt.setName('rol_extra_2').setDescription('Otro rol adicional opcional').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('addrole')
                .setDescription('Agregar un rol EXTRA para ver tickets de una categoría')
                .addStringOption(opt => opt.setName('categoria').setDescription('Nombre exacto de la categoría').setRequired(true))
                .addRoleOption(opt => opt.setName('rol').setDescription('Rol extra a añadir').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('edit')
                .setDescription('Modificar una categoría existente')
                .addStringOption(opt => opt.setName('nombre_actual').setDescription('Nombre actual de la categoría a editar').setRequired(true))
                .addStringOption(opt => opt.setName('nuevo_nombre').setDescription('Nuevo nombre (Opcional)'))
                .addStringOption(opt => opt.setName('nuevo_descripcion').setDescription('Nueva descripción (Opcional)'))
                .addStringOption(opt => opt.setName('nuevo_emoji').setDescription('Nuevo emoji (Opcional)'))
                .addRoleOption(opt => opt.setName('nuevo_rol').setDescription('Nuevo rol principal (Reemplaza la lista anterior)').setRequired(false))
                .addRoleOption(opt => opt.setName('nuevo_rol_extra_1').setDescription('Nuevo rol extra 1').setRequired(false))
                .addRoleOption(opt => opt.setName('nuevo_rol_extra_2').setDescription('Nuevo rol extra 2').setRequired(false))
                .addChannelOption(opt => opt.setName('nueva_categoria').setDescription('Nueva categoría de Discord destino').addChannelTypes(ChannelType.GuildCategory))
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
            sub.setName('metrics')
                .setDescription('Muestra estadísticas de rendimiento del sistema de tickets')
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
                return interaction.reply({ content: `✅ Canal de transcripts configurado en ${channel}.`, flags: [MessageFlags.Ephemeral] });
            } catch (err) {
                return interaction.reply({ content: "❌ Error guardando la configuración.", flags: [MessageFlags.Ephemeral] });
            }
        }

        // 2. AÑADIR CATEGORÍA
        if (sub === 'add') {
            const name = interaction.options.getString('nombre');
            const role = interaction.options.getRole('rol');
            const role2 = interaction.options.getRole('rol_extra_1');
            const role3 = interaction.options.getRole('rol_extra_2');
            const parentCat = interaction.options.getChannel('categoria_discord');
            const emoji = interaction.options.getString('emoji');
            const desc = interaction.options.getString('descripcion');

            // Lógica de múltiples roles
            let roleIdsToSave = [role.id];
            if (role2) roleIdsToSave.push(role2.id);
            if (role3) roleIdsToSave.push(role3.id);

            // Si hay más de uno, guardamos como JSON String. Si es uno, guardamos ID plano (o JSON, ambos soportados).
            // Para consistencia futura, si hay >1 usamos Array.
            const roleIdField = roleIdsToSave.length > 1 ? JSON.stringify(roleIdsToSave) : role.id;

            const success = await addTicketCategory(guildId, {
                name,
                description: desc,
                emoji,
                roleId: roleIdField,
                targetCategoryId: parentCat.id
            });

            if (success) {
                const roleNames = roleIdsToSave.map(id => `<@&${id}>`).join(', ');
                return interaction.reply({ content: `✅ Categoría **${name}** creada con éxito.\n> **Roles:** ${roleNames}\n> **Ubicación:** ${parentCat.name}`, flags: [MessageFlags.Ephemeral] });
            } else {
                return interaction.reply({ content: `❌ Hubo un error al guardar la categoría.`, flags: [MessageFlags.Ephemeral] });
            }
        }

        // 3. AÑADIR ROL SECUNDARIO
        if (sub === 'addrole') {
            const name = interaction.options.getString('categoria');
            const role = interaction.options.getRole('rol');

            const success = await addRoleToCategory(guildId, name, role.id);
            if (success) {
                return interaction.reply({ content: `✅ Rol **${role.name}** agregado a la categoría **${name}**.`, flags: [MessageFlags.Ephemeral] });
            } else {
                return interaction.reply({ content: `❌ No se encontró la categoría o hubo un error DB.`, flags: [MessageFlags.Ephemeral] });
            }
        }

        // 3.5. EDITAR CATEGORÍA
        if (sub === 'edit') {
            const currentName = interaction.options.getString('nombre_actual');
            const newName = interaction.options.getString('nuevo_nombre');
            const newDesc = interaction.options.getString('nuevo_descripcion');
            const newEmoji = interaction.options.getString('nuevo_emoji');

            const newRole = interaction.options.getRole('nuevo_rol');
            const newRole2 = interaction.options.getRole('nuevo_rol_extra_1');
            const newRole3 = interaction.options.getRole('nuevo_rol_extra_2');

            const newCat = interaction.options.getChannel('nueva_categoria');

            const updates = {};
            if (newName) updates.newName = newName;
            if (newDesc) updates.description = newDesc;
            if (newEmoji) updates.emoji = newEmoji;
            if (newCat) updates.targetCategoryId = newCat.id;

            // Lógica de Roles en Edit
            if (newRole || newRole2 || newRole3) {
                // Si el usuario especifica roles nuevos, REEMPLAZAMOS la lista anterior.
                // Asumimos que "Edit" es una acción completa para la propiedad roles.
                // Si solo pone newRole, la lista pasa a ser [newRole].
                // Si pone newRole + newRole2, pasa a ser [newRole, newRole2].

                let newRolesList = [];
                if (newRole) newRolesList.push(newRole.id);
                if (newRole2) newRolesList.push(newRole2.id);
                if (newRole3) newRolesList.push(newRole3.id);

                if (newRolesList.length > 0) {
                    updates.roleId = newRolesList.length > 1 ? JSON.stringify(newRolesList) : newRolesList[0];
                }
            }

            if (Object.keys(updates).length === 0) {
                return interaction.reply({ content: "⚠️ No especificaste ningún cambio.", flags: [MessageFlags.Ephemeral] });
            }

            const success = await updateTicketCategory(guildId, currentName, updates);

            if (success) {
                const changes = [];
                if (newName) changes.push(`Nombre: **${newName}**`);
                if (newDesc) changes.push(`Desc: *${newDesc}*`);
                if (newEmoji) changes.push(`Emoji: ${newEmoji}`);

                if (updates.roleId) {
                    // Reconstruimos visualmente
                    let displayRoles = updates.roleId.startsWith('[') ? JSON.parse(updates.roleId) : [updates.roleId];
                    changes.push(`Roles: ${displayRoles.map(id => `<@&${id}>`).join(', ')} (Lista Actualizada)`);
                }

                if (newCat) changes.push(`Destino: ${newCat}`);

                return interaction.reply({ content: `✅ Categoría **${currentName}** actualizada.\n> ${changes.join('\n> ')}`, flags: [MessageFlags.Ephemeral] });
            } else {
                return interaction.reply({ content: `❌ No se encontró la categoría **${currentName}** o hubo un error.`, flags: [MessageFlags.Ephemeral] });
            }
        }

        // 4. ELIMINAR CATEGORÍA
        if (sub === 'remove') {
            const name = interaction.options.getString('nombre');
            const success = await removeTicketCategory(guildId, name);
            if (success) {
                return interaction.reply({ content: `🗑️ Categoría **${name}** eliminada.`, flags: [MessageFlags.Ephemeral] });
            } else {
                return interaction.reply({ content: `❌ No se pudo eliminar (quizás no existe).`, flags: [MessageFlags.Ephemeral] });
            }
        }

        // 5. LISTAR CATEGORÍAS
        if (sub === 'list') {
            const categories = await getTicketCategories(guildId);
            if (categories.length === 0) return interaction.reply({ content: "⚠️ No hay categorías configuradas.", flags: [MessageFlags.Ephemeral] });

            const list = await Promise.all(categories.map(async c => {
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

                // Intentamos buscar el nombre real de la categoría para que no se vea feo como mención <#ID>
                const channel = await interaction.guild.channels.fetch(c.targetCategoryId).catch(() => null);
                const categoryName = channel ? channel.name : `Desconocida (${c.targetCategoryId})`;

                return `**${c.name}** ${c.emoji}\n> 📝 *${c.description}*\n> 🛡️ **Roles:** ${rolesDisplay}\n> 📂 **Destino:** \`${categoryName}\``;
            }));

            const embed = new EmbedBuilder()
                .setTitle("📂 Categorías de Tickets")
                .setDescription(list.join('\n\n'))
                .setColor(0x3498db);
            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });


        }

        // 6. ENVIAR PANEL (Grid de Botones)
        if (sub === 'panel') {
            const categories = await getTicketCategories(guildId);
            if (categories.length === 0) return interaction.reply({ content: "⚠️ Primero debes añadir categorías con `/ticket add`.", flags: [MessageFlags.Ephemeral] });

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
            return interaction.reply({ content: "✅ Panel (Modo Botones) enviado.", flags: [MessageFlags.Ephemeral] });
        }

        // 7. MÉTRICAS (KPIs)
        if (sub === 'metrics') {
            const metrics = await getTicketMetrics(guildId);

            if (!metrics) {
                return interaction.reply({ content: "❌ Error obteniendo métricas.", flags: [MessageFlags.Ephemeral] });
            }

            // Formatear Tiempo
            const hours = Math.floor(metrics.avgResolutionTime / 60);
            const minutes = metrics.avgResolutionTime % 60;
            const timeString = `${hours}h ${minutes}m`;

            // Top Staff
            const staffGraph = metrics.ticketsByStaff.length > 0
                ? metrics.ticketsByStaff.map((s, i) => `${['🥇', '🥈', '🥉'][i] || '🏅'} <@${s.claimedBy}>: **${s.count}** tickets`).join('\n')
                : "Sin datos de Staff.";

            // Categorías
            const catGraph = metrics.ticketsByCategory.length > 0
                ? metrics.ticketsByCategory.map(c => `**${c.type}**: ${c.count}`).join('\n')
                : "Sin tickets creados.";

            const embed = new EmbedBuilder()
                .setTitle("📊 Rendimiento de Soporte | Tickets KPIs")
                .setColor(0x9b59b6)
                .addFields(
                    { name: "⏱️ Tiempo Promedio Resolución", value: `\`${timeString}\``, inline: true },
                    { name: "📂 Volumen por Categoría", value: catGraph, inline: true },
                    { name: "🏆 Top Staff (Tickets Resueltos)", value: staffGraph, inline: false }
                )
                .setFooter({ text: "Capi Netta Analytics" })
                .setTimestamp();

            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }
    }
};
