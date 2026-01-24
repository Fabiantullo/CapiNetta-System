const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    PermissionsBitField, ChannelType, AttachmentBuilder, UserSelectMenuBuilder, StringSelectMenuBuilder
} = require('discord.js');
const {
    getCategoryByName, createTicketDB, updateTicketChannel, closeTicketDB, getTicketByChannel, assignTicket
} = require('./ticketDB');
const { getGuildSettings } = require('./dataHandler');

// --- HELPERS ---

// Generar Botonera según estado
function getTicketControls(isClaimed, isUserStaff) {
    const row = new ActionRowBuilder();

    // 1. Claim (Solo visible si NO está claimeado y es staff? Discord buttons no se ocultan por rol dinamicamente facil sin recargar, 
    // pero podemos deshabilitar o cambiar estilo.
    // Estrategia: Si NO está claimeado => Botón CLAIM (Green).
    // Si SI está claimeado => Botón CLAIM (Deleted) o Deshabilitado.

    if (!isClaimed) {
        row.addComponents(
            new ButtonBuilder().setCustomId('claim_ticket').setLabel('Reclamar Ticket').setEmoji('🙋‍♂️').setStyle(ButtonStyle.Success)
        );
    }

    // 2. Transferir (Deshabilitado si no está claimeado)
    row.addComponents(
        new ButtonBuilder().setCustomId('transfer_ticket').setLabel('Transferir').setEmoji('🔄').setStyle(ButtonStyle.Secondary).setDisabled(!isClaimed)
    );

    // 3. Cerrar
    row.addComponents(
        new ButtonBuilder().setCustomId('close_ticket').setLabel('Cerrar Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
    );

    return row;
}

async function logTicketAction(guild, action, ticketChannel, executor, target = null) {
    try {
        const settings = await getGuildSettings(guild.id);
        if (settings && settings.ticketLogsChannel) {
            const logChannel = guild.channels.cache.get(settings.ticketLogsChannel);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setTitle(`Ticket Log: ${action}`)
                    .setDescription(`**Canal:** ${ticketChannel}\n**Ejecutado por:** ${executor}\n${target ? `**Objetivo:** ${target}` : ''}`)
                    .setColor(0xF1C40F)
                    .setTimestamp();
                await logChannel.send({ embeds: [embed] });
            }
        }
    } catch (e) {
        console.error("Error logging ticket action:", e);
    }
}

// --- HANDLER PRINCIPAL ---

async function handleTicketInteraction(interaction) {
    const { customId, guild, user, member, channel } = interaction;

    // 0. CREACIÓN
    if (customId.startsWith('create_ticket_')) {
        const categoryName = customId.replace('create_ticket_', '');
        return await CreateTicket(interaction, categoryName);
    }

    // --- ACCIONES DENTRO DEL TICKET ---

    // Validar si es un ticket
    const ticket = await getTicketByChannel(channel.id);
    if (!ticket) return interaction.reply({ content: "❌ Este canal no está registrado como ticket válido.", ephemeral: true });

    // Determinar permisos del usuario actual
    const categoryData = await getCategoryByName(guild.id, ticket.type);
    let allowedRoles = [];
    try { allowedRoles = categoryData.roleId.startsWith('[') ? JSON.parse(categoryData.roleId) : [categoryData.roleId]; } catch (e) { allowedRoles = [categoryData.roleId]; }
    const isStaff = allowedRoles.some(r => member.roles.cache.has(r)) || member.permissions.has(PermissionsBitField.Flags.Administrator);

    // 1. CLAIM TICKET
    if (customId === 'claim_ticket') {
        if (!isStaff) return interaction.reply({ content: "🚫 Solo el staff puede reclamar tickets.", ephemeral: true });

        // Actualizar DB
        await assignTicket(channel.id, user.id);
        // Log
        await logTicketAction(guild, "Ticket Reclamado", channel, user);

        // Actualizar Embed Inicial
        // Truco: Editar el mensaje original de la interacción o el mensaje del panel?
        // El boton Claim está en el mensaje de bienvenida del ticket. Interaction es el click.
        // Podemos editar interaction.message

        const oldEmbed = interaction.message.embeds[0];
        const newEmbed = EmbedBuilder.from(oldEmbed)
            .addFields({ name: "🧑‍💼 Asignado a", value: `${user}`, inline: false })
            .setColor(0x2ecc71); // Verde Claimed

        const newRow = getTicketControls(true, isStaff);

        await interaction.update({ embeds: [newEmbed], components: [newRow] });
        return channel.send({ content: `✅ **${user.username}** ha reclamado este ticket.` });
    }

    // 2. TRANSFERIR TICKET (Menu selection)
    if (customId === 'transfer_ticket') {
        if (!isStaff) return interaction.reply({ content: "🚫 Acción solo para staff.", ephemeral: true });

        // Validar si es el dueño del claim o admin
        if (ticket.claimedBy && ticket.claimedBy !== user.id && !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: `🚫 Este ticket pertenece a <@${ticket.claimedBy}>. Solo él o Dirección pueden transferirlo.`, ephemeral: true });
        }

        const userSelect = new UserSelectMenuBuilder()
            .setCustomId('confirm_transfer_select')
            .setPlaceholder('Selecciona al nuevo encargado...')
            .setMaxValues(1);

        const row = new ActionRowBuilder().addComponents(userSelect);
        return interaction.reply({ content: "Selecciona al miembro del staff a quien transferir:", components: [row], ephemeral: true });
    }

    // 3. CONFIRMAR TRANSFERENCIA
    if (customId === 'confirm_transfer_select') {
        const targetUserId = interaction.values[0];
        await assignTicket(channel.id, targetUserId);
        await logTicketAction(guild, "Ticket Transferido", channel, user, `<@${targetUserId}>`);

        // Necesitamos actualizar el mensaje original (Embed Principal).
        // Como estamos en una respuesta efímera, no tenemos acceso directo fácil a "ese" mensaje específico a menos que lo busquemos o guardemos ID.
        // Búsqueda simple: El mensaje pinned o el primer mensaje del bot?
        // Alternativa: Enviar un nuevo embed de estado y borrar el anterior? No.
        // Mejor: Enviar mensaje de aviso y YA. El embed de arriba quedará con el "Asignado a" viejo hasta que alguien interactue? 
        // No, podemos intentar buscar el mensaje.

        channel.send({ content: `🔄 Ticket transferido a <@${targetUserId}> por ${user}.` });
        return interaction.update({ content: `✅ Transferido exitosamente a <@${targetUserId}>`, components: [] });

        // *Mejora futura: Guardar messageId en DB para editarlo siempre.*
    }

    // 4. CERRAR TICKET LOGIC
    if (customId === 'close_ticket') {
        // Regla: Si está asignado, solo el asignado o admin puede borrar.
        if (ticket.claimedBy && ticket.claimedBy !== user.id && !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: `🚫 Ticket reclamado por <@${ticket.claimedBy}>. Solo él o Administración pueden cerrarlo.`, ephemeral: true });
        }

        // Validación standard (Staff o Dueño)
        const isOwner = ticket.userId === user.id;
        if (!isOwner && !isStaff) return interaction.reply({ content: "🚫 No tienes permisos.", ephemeral: true });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('confirm_close').setLabel('Sí, cerrar ticket').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('cancel_close').setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
        );
        return interaction.reply({ content: '¿Estás seguro de que querés cerrar este ticket?', components: [row], ephemeral: true });
    }

    if (customId === 'confirm_close') {
        await interaction.update({ content: '🔒 Cerrando ticket y generando transcript...', components: [] });
        await CloseTicket(interaction, ticket);
    }

    if (customId === 'cancel_close') {
        await interaction.update({ content: 'Operación cancelada.', components: [] });
    }
}

async function CreateTicket(interaction, categoryName) {
    try {
        await interaction.deferReply({ ephemeral: true });

        const categoryData = await getCategoryByName(interaction.guild.id, categoryName);
        if (!categoryData) return interaction.editReply({ content: "❌ Error: La categoría ya no existe." });

        const ticketId = await createTicketDB(interaction.guild.id, interaction.user.id, categoryName);
        if (!ticketId) return interaction.editReply({ content: "❌ Error DB." });

        const paddedId = ticketId.toString().padStart(4, '0');
        const channelName = `ticket-${paddedId}`;

        // Roles
        let allowedRolesIds = [];
        try { allowedRolesIds = categoryData.roleId.startsWith('[') ? JSON.parse(categoryData.roleId) : [categoryData.roleId]; } catch (e) { allowedRolesIds = [categoryData.roleId]; }

        const permissionOverwrites = [
            { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            { id: interaction.client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] }
        ];

        allowedRolesIds.forEach(rId => {
            permissionOverwrites.push({ id: rId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
        });

        const ticketChannel = await interaction.guild.channels.create({
            name: channelName, type: ChannelType.GuildText, parent: categoryData.targetCategoryId || null, permissionOverwrites
        });

        await updateTicketChannel(ticketId, ticketChannel.id);

        // Mensaje Bienvenida
        const embed = new EmbedBuilder()
            .setTitle(`${categoryData.emoji || '🎫'} ${categoryName} | Ticket #${paddedId}`)
            .setDescription(`Hola <@${interaction.user.id}>, bienvenido al soporte.\n\n**Detalles:**\n> Explica tu situación detalladamente.\n> El equipo de Staff te atenderá pronto.`)
            .setColor(0x3498db)
            .setFooter({ text: "Capi Netta System • Soporte Seguro" })
            .setTimestamp();

        // Botonera Inicial (Sin reclamar -> Claim habilitado, Transfer deshabilitado)
        const row = getTicketControls(false, false);

        await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });
        await interaction.editReply({ content: `✅ Ticket creado: ${ticketChannel}` });

    } catch (e) {
        console.error(e);
        await interaction.editReply({ content: "❌ Error creando canal." });
    }
}

async function CloseTicket(interaction, ticketData) {
    const channel = interaction.channel;
    const guild = interaction.guild;
    const settings = await getGuildSettings(guild.id);

    try {
        if (settings && settings.ticketLogsChannel) {
            const logChannel = guild.channels.cache.get(settings.ticketLogsChannel);
            if (logChannel) {
                const messages = await channel.messages.fetch({ limit: 100 });
                const transcriptText = messages.reverse().map(m => {
                    const attachments = m.attachments.map(a => `<${a.url}>`).join(', ');
                    return `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content} ${attachments}`;
                }).join('\n');

                const buffer = Buffer.from(transcriptText, 'utf-8');
                const attachment = new AttachmentBuilder(buffer, { name: `transcript-${channel.name}.txt` });

                const logEmbed = new EmbedBuilder()
                    .setTitle("📝 Ticket Cerrado")
                    .addFields(
                        { name: "Ticket", value: channel.name, inline: true },
                        { name: "Autor", value: ticketData ? `<@${ticketData.userId}>` : "Desconocido", inline: true },
                        { name: "Cerrado por", value: `<@${interaction.user.id}>`, inline: true },
                        { name: "Reclamado por", value: ticketData.claimedBy ? `<@${ticketData.claimedBy}>` : "Nadie", inline: true }
                    )
                    .setColor(0xe74c3c)
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed], files: [attachment] });
            }
        }
    } catch (err) {
        console.error("Error transcript:", err);
    }

    await closeTicketDB(channel.id);
    setTimeout(() => { channel.delete().catch(() => { }); }, 5000);
}

module.exports = { handleTicketInteraction };
