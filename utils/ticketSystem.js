const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    PermissionsBitField, ChannelType, AttachmentBuilder
} = require('discord.js');
const {
    getCategoryByName, createTicketDB, updateTicketChannel, closeTicketDB, getTicketByChannel
} = require('./ticketDB');
const { getGuildSettings } = require('./dataHandler');

async function handleTicketInteraction(interaction) {
    const { customId, guild, user, member } = interaction;

    // 1. Crear Ticket
    if (customId.startsWith('create_ticket_')) {
        const categoryName = customId.replace('create_ticket_', '');
        await CreateTicket(interaction, categoryName);
    }

    // VALIDACIÓN DE PERMISOS PARA CERRAR
    if (['close_ticket', 'confirm_close'].includes(customId)) {
        const channelId = interaction.channel.id;
        const ticket = await getTicketByChannel(channelId);

        if (!ticket) return interaction.reply({ content: "❌ Este canal no está registrado como ticket activo.", ephemeral: true });

        // Buscamos la categoría para saber el Rol de Staff 
        const categoryData = await getCategoryByName(guild.id, ticket.type);

        // Parsear roles (puede ser string unico o array JSON)
        let allowedRoles = [];
        if (categoryData) {
            try {
                if (categoryData.roleId.startsWith('[')) allowedRoles = JSON.parse(categoryData.roleId);
                else allowedRoles = [categoryData.roleId];
            } catch (e) { allowedRoles = [categoryData.roleId]; }
        }

        const hasStaffRole = allowedRoles.some(roleId => member.roles.cache.has(roleId));
        const isOwner = ticket.userId === user.id;
        const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!isOwner && !hasStaffRole && !isAdmin) {
            return interaction.reply({ content: "🚫 No tienes permiso para gestionar este ticket. Solo el autor o el staff pueden hacerlo.", ephemeral: true });
        }
    }

    // 2. Cerrar Ticket (Paso 1: Confirmación)
    if (customId === 'close_ticket') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('confirm_close').setLabel('Sí, cerrar ticket').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('cancel_close').setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
        );
        return interaction.reply({ content: '¿Estás seguro de que querés cerrar este ticket?', components: [row], ephemeral: true });
    }

    // 3. Confirmar Cierre
    if (customId === 'confirm_close') {
        const ticket = await getTicketByChannel(interaction.channel.id); // Re-fetch para datos
        await interaction.update({ content: '🔒 Cerrando ticket y generando transcript...', components: [] });
        await CloseTicket(interaction, ticket);
    }

    // 4. Cancelar Cierre
    if (customId === 'cancel_close') {
        await interaction.update({ content: 'Operación cancelada.', components: [] });
    }
}

async function CreateTicket(interaction, categoryName) {
    try {
        await interaction.deferReply({ ephemeral: true });

        const categoryData = await getCategoryByName(interaction.guild.id, categoryName);
        if (!categoryData) return interaction.editReply({ content: "❌ Error: La categoría de este ticket ya no existe." });

        // 1. Crear registro en DB para obtener ID secuencial
        const ticketId = await createTicketDB(interaction.guild.id, interaction.user.id, categoryName);
        if (!ticketId) return interaction.editReply({ content: "❌ Error de base de datos al crear el ticket." });

        // 2. Formatear nombre: ticket-0012
        const paddedId = ticketId.toString().padStart(4, '0');
        const channelName = `ticket-${paddedId}`; // FORMATO SOLICITADO

        // 3. Preparar Roles (Unico o Multiple)
        let allowedRolesIds = [];
        try {
            if (categoryData.roleId.startsWith('[')) allowedRolesIds = JSON.parse(categoryData.roleId);
            else allowedRolesIds = [categoryData.roleId];
        } catch (e) { allowedRolesIds = [categoryData.roleId]; }

        // Definir permisos bases
        const permissionOverwrites = [
            { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }, // @everyone OFF
            { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }, // Usuario ON
            { id: interaction.client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] } // Bot ON
        ];

        // Agregar permisos para cada rol de staff
        allowedRolesIds.forEach(rId => {
            permissionOverwrites.push({
                id: rId,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
            });
        });

        // 4. Crear Canal
        const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: categoryData.targetCategoryId || null,
            permissionOverwrites: permissionOverwrites
        });

        // 5. Actualizar DB con el ID del canal
        await updateTicketChannel(ticketId, ticketChannel.id);

        // 6. Enviar mensaje de bienvenida
        const rolesMentions = allowedRolesIds.map(r => `<@&${r}>`).join(' ');

        const embed = new EmbedBuilder()
            .setTitle(`${categoryData.emoji || '🎫'} ${categoryName} | Ticket #${paddedId}`)
            .setDescription(`Hola <@${interaction.user.id}>, bienvenido al soporte.\n\n**Detalles:**\n> Explica tu situación detalladamente.\n> El equipo de ${rolesMentions} te atenderá pronto.`)
            .setColor(0x3498db)
            .setFooter({ text: "Capi Netta System • Soporte Seguro" })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Cerrar Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ content: `<@${interaction.user.id}> | ${rolesMentions}`, embeds: [embed], components: [row] });

        await interaction.editReply({ content: `✅ Ticket creado correctamente: ${ticketChannel}` });

    } catch (e) {
        console.error(e);
        await interaction.editReply({ content: "❌ Ocurrió un error inesperado al crear el canal." });
    }
}

async function CloseTicket(interaction, ticketData) {
    const channel = interaction.channel;
    const guild = interaction.guild;

    // 1. Logs / Transcript
    try {
        const settings = await getGuildSettings(guild.id);
        if (settings && settings.ticketLogsChannel) {
            const logChannel = guild.channels.cache.get(settings.ticketLogsChannel);
            if (logChannel) {
                // Generar Transcript
                const messages = await channel.messages.fetch({ limit: 100 });
                // Mensajes de más nuevo a más viejo por defecto, los invertimos
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
                        { name: "Cerrado por", value: `<@${interaction.user.id}>`, inline: true }
                    )
                    .setColor(0xe74c3c)
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed], files: [attachment] });
            }
        }
    } catch (err) {
        console.error("Error generando transcript:", err);
    }

    // 2. Guardar estado en DB
    await closeTicketDB(channel.id);

    // 3. Borrar tras 5 segundos
    setTimeout(() => {
        channel.delete().catch(() => { });
    }, 5000);
}

module.exports = { handleTicketInteraction };
