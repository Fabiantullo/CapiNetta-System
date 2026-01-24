const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    PermissionsBitField, ChannelType, AttachmentBuilder
} = require('discord.js');
const {
    getCategoryByName, createTicketDB, updateTicketChannel, closeTicketDB, getTicketByChannel
} = require('./ticketDB');

async function handleTicketInteraction(interaction) {
    const { customId, guild, user, channel } = interaction;

    // 1. Crear Ticket
    if (customId.startsWith('create_ticket_')) {
        const categoryName = customId.replace('create_ticket_', '');
        await CreateTicket(interaction, categoryName);
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
        await interaction.update({ content: '🔒 Cerrando ticket en 5 segundos...', components: [] });
        await CloseTicket(interaction);
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
        const channelName = `${categoryData.emoji ? '🎫' : 'ticket'}-${paddedId}`;

        // 3. Crear Canal
        const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: categoryData.targetCategoryId || null, // Si es null, lo crea sin categoría (arriba del todo)
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel] // Nadie ve
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] // Usuario ve
                },
                {
                    id: categoryData.roleId, // Rol de Soporte ve
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
                },
                {
                    id: interaction.client.user.id, // Bot ve
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels]
                }
            ]
        });

        // 4. Actualizar DB con el ID del canal
        await updateTicketChannel(ticketId, ticketChannel.id);

        // 5. Enviar mensaje de bienvenida
        const embed = new EmbedBuilder()
            .setTitle(`${categoryData.emoji || '🎫'} ${categoryName} | Ticket #${paddedId}`)
            .setDescription(`Hola <@${interaction.user.id}>, bienvenido al soporte.\n\n**Detalles:**\n> Explica tu situación detalladamente.\n> El equipo de <@&${categoryData.roleId}> te atenderá pronto.`)
            .setColor(0x3498db)
            .setFooter({ text: "Capi Netta System • Soporte Seguro" })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Cerrar Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ content: `<@${interaction.user.id}> | <@&${categoryData.roleId}>`, embeds: [embed], components: [row] });

        await interaction.editReply({ content: `✅ Ticket creado correctamente: ${ticketChannel}` });

    } catch (e) {
        console.error(e);
        await interaction.editReply({ content: "❌ Ocurrió un error inesperado al crear el canal." });
    }
}

async function CloseTicket(interaction) {
    const channel = interaction.channel;

    // 1. Guardar estado en DB
    await closeTicketDB(channel.id);

    // 2. Generar Transcript (Texto simple por ahora)
    // En una versión avanzada, aquí se iterarían los mensajes y se guardaría un HTML o TXT

    // 3. Borrar tras 5 segundos
    setTimeout(() => {
        channel.delete().catch(() => { });
    }, 5000);
}

module.exports = { handleTicketInteraction };
