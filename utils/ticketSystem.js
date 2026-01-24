const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    PermissionsBitField, ChannelType, AttachmentBuilder, UserSelectMenuBuilder
} = require('discord.js');
const {
    getCategoryByName, createTicketDB, updateTicketChannel, closeTicketDB, getTicketByChannel, assignTicket, logTicketActionDB
} = require('./ticketDB');
const { getGuildSettings } = require('./dataHandler');

// --- HELPERS ---

function getTicketControls(isClaimed, isUserStaff) {
    const row = new ActionRowBuilder();

    // 1. Claim
    if (!isClaimed) {
        row.addComponents(
            new ButtonBuilder().setCustomId('claim_ticket').setLabel('Reclamar Ticket').setEmoji('🙋‍♂️').setStyle(ButtonStyle.Success)
        );
    }

    // 2. Transferir
    row.addComponents(
        new ButtonBuilder().setCustomId('transfer_ticket').setLabel('Transferir').setEmoji('🔄').setStyle(ButtonStyle.Secondary).setDisabled(!isClaimed)
    );

    // 3. Cerrar
    row.addComponents(
        new ButtonBuilder().setCustomId('close_ticket').setLabel('Cerrar Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
    );

    return row;
}

// Helper para encontrar el mensaje principal del bot en el ticket (para editarlo cuando la interacción es efímera)
async function getMainTicketMessage(channel) {
    try {
        const messages = await channel.messages.fetch({ limit: 10 });
        // FIltrar mensaje del propio bot que tenga embeds
        return messages.find(m => m.author.id === channel.client.user.id && m.embeds.length > 0);
    } catch (e) { return null; }
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

    // Validar ticket
    const ticket = await getTicketByChannel(channel.id);
    if (!ticket) return interaction.reply({ content: "❌ Contactar Admin (Ticket ID no encontrado).", ephemeral: true });

    // Permisos
    const categoryData = await getCategoryByName(guild.id, ticket.type);
    let allowedRoles = [];
    try { allowedRoles = categoryData.roleId.startsWith('[') ? JSON.parse(categoryData.roleId) : [categoryData.roleId]; } catch (e) { allowedRoles = [categoryData.roleId]; }
    const isStaff = allowedRoles.some(r => member.roles.cache.has(r)) || member.permissions.has(PermissionsBitField.Flags.Administrator);

    // 1. CLAIM TICKET (🟡 -> 🟢)
    if (customId === 'claim_ticket') {
        if (!isStaff) return interaction.reply({ content: "🚫 Solo staff.", ephemeral: true });

        await assignTicket(channel.id, user.id);
        await logTicketActionDB(ticket.ticketId, 'CLAIM', user.id);
        await logTicketAction(guild, "Ticket Reclamado", channel, user);

        // Update Embed: GREEN (0x2ECC71)
        const oldEmbed = interaction.message.embeds[0];
        const newEmbed = EmbedBuilder.from(oldEmbed)
            .addFields({ name: "🧑‍💼 Asignado a", value: `${user}`, inline: false })
            .setColor(0x2ECC71); // GREEN

        const newRow = getTicketControls(true, isStaff);

        await interaction.update({ embeds: [newEmbed], components: [newRow] });
        return channel.send({ content: `✅ **${user.username}** ha reclamado este ticket.` });
    }

    // 2. TRANSFERIR TICKET
    if (customId === 'transfer_ticket') {
        if (!isStaff) return interaction.reply({ content: "🚫 Staff only.", ephemeral: true });

        if (ticket.claimedBy && ticket.claimedBy !== user.id && !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: `🚫 Pertenece a <@${ticket.claimedBy}>.`, ephemeral: true });
        }

        const userSelect = new UserSelectMenuBuilder()
            .setCustomId('confirm_transfer_select')
            .setPlaceholder('Selecciona al nuevo encargado...')
            .setMaxValues(1);

        const row = new ActionRowBuilder().addComponents(userSelect);
        return interaction.reply({ content: "Selecciona destinatario:", components: [row], ephemeral: true });
    }

    // 3. CONFIRMAR TRANSFERENCIA (🟢 -> 🔵)
    if (customId === 'confirm_transfer_select') {
        const targetUserId = interaction.values[0];
        await assignTicket(channel.id, targetUserId);
        await logTicketActionDB(ticket.ticketId, 'TRANSFER', user.id, targetUserId);
        await logTicketAction(guild, "Ticket Transferido", channel, user, `<@${targetUserId}>`);

        // Update Embed: BLUE (0x3498DB)
        // Necesitamos buscar el mensaje porque esta interaccion es efimera
        const mainMsg = await getMainTicketMessage(channel);
        if (mainMsg) {
            const oldEmbed = mainMsg.embeds[0];
            // Remover campo previo de asignado si existe para no duplicar?
            // .spliceFields no existe directo en builder, pero podemos filtrar
            const newFields = oldEmbed.fields.filter(f => f.name !== "🧑‍💼 Asignado a");
            newFields.push({ name: "🧑‍💼 Asignado a", value: `<@${targetUserId}>`, inline: false });

            const newEmbed = EmbedBuilder.from(oldEmbed)
                .setFields(newFields)
                .setColor(0x3498DB); // BLUE

            await mainMsg.edit({ embeds: [newEmbed] });
        }

        channel.send({ content: `🔄 Ticket transferido a <@${targetUserId}> por ${user}.` });
        return interaction.update({ content: `✅ Listo. Transferido a <@${targetUserId}>.`, components: [] });
    }

    // 4. CERRAR TICKET
    if (customId === 'close_ticket') {
        if (ticket.claimedBy && ticket.claimedBy !== user.id && !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: `🚫 Reclamado por <@${ticket.claimedBy}>.`, ephemeral: true });
        }

        const isOwner = ticket.userId === user.id;
        if (!isOwner && !isStaff) return interaction.reply({ content: "🚫 No tienes permisos.", ephemeral: true });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('confirm_close').setLabel('Sí, cerrar ticket').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('cancel_close').setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
        );
        return interaction.reply({ content: '¿Confirmar cierre?', components: [row], ephemeral: true });
    }

    if (customId === 'confirm_close') {
        await interaction.update({ content: '🔒 Cerrando...', components: [] });
        await CloseTicket(interaction, ticket);
    }

    if (customId === 'cancel_close') {
        await interaction.update({ content: 'Cancelado.', components: [] });
    }
}

async function CreateTicket(interaction, categoryName) {
    try {
        await interaction.deferReply({ ephemeral: true });

        const categoryData = await getCategoryByName(interaction.guild.id, categoryName);
        if (!categoryData) return interaction.editReply({ content: "❌ Categoría no encontrada." });

        const ticketId = await createTicketDB(interaction.guild.id, interaction.user.id, categoryName);
        if (!ticketId) return interaction.editReply({ content: "❌ Error DB." });

        await logTicketActionDB(ticketId, 'OPEN', interaction.user.id);

        const paddedId = ticketId.toString().padStart(4, '0');
        const channelName = `ticket-${paddedId}`;

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

        // Mensaje Bienvenida: YELLOW (0xF1C40F)
        const embed = new EmbedBuilder()
            .setTitle(`${categoryData.emoji || '🎫'} ${categoryName} | Ticket #${paddedId}`)
            .setDescription(`Hola <@${interaction.user.id}>, bienvenido al soporte.\n\n**Detalles:**\n> Explica tu situación detalladamente.\n> El equipo de Staff te atenderá pronto.`)
            .setColor(0xF1C40F) // YELLOW
            .setFooter({ text: "Capi Netta System • Soporte Seguro" })
            .setTimestamp();

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
        await logTicketActionDB(ticketData.ticketId, 'CLOSE', interaction.user.id);

        let attachment = null;
        const messages = await channel.messages.fetch({ limit: 100 });
        const transcriptText = messages.reverse().map(m => {
            const attachments = m.attachments.map(a => `<${a.url}>`).join(', ');
            return `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content} ${attachments}`;
        }).join('\n');
        const buffer = Buffer.from(transcriptText, 'utf-8');
        attachment = new AttachmentBuilder(buffer, { name: `transcript-${channel.name}.txt` });

        // Log Channel Embed: RED (0xE74C3C)
        if (settings && settings.ticketLogsChannel) {
            const logChannel = guild.channels.cache.get(settings.ticketLogsChannel);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle("📝 Ticket Cerrado")
                    .addFields(
                        { name: "Ticket", value: channel.name, inline: true },
                        { name: "Autor", value: ticketData ? `<@${ticketData.userId}>` : "Desconocido", inline: true },
                        { name: "Cerrado por", value: `<@${interaction.user.id}>`, inline: true },
                        { name: "Reclamado por", value: ticketData.claimedBy ? `<@${ticketData.claimedBy}>` : "Nadie", inline: true }
                    )
                    .setColor(0xE74C3C) // RED
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed], files: [attachment] });
            }
        }

        try {
            const ticketUser = await guild.members.fetch(ticketData.userId);
            if (ticketUser) {
                await ticketUser.send({
                    content: `👋 Tu ticket **${channel.name}** ha sido cerrado.`,
                    files: [attachment]
                });
            }
        } catch (dmErr) { console.log("DM fallido"); }

    } catch (err) { console.error(err); }

    await closeTicketDB(channel.id);
    setTimeout(() => { channel.delete().catch(() => { }); }, 5000);
}

module.exports = { handleTicketInteraction };
