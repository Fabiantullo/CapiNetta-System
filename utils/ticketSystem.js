/**
 * @file ticketSystem.js
 * @description Módulo principal de lógica para el sistema de Tickets.
 * Encargado de manejar interacciones (botones, menús), crear canales,
 * gestionar permisos y registrar logs.
 * 
 * @author Capi Netta Dev Team
 */

const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    PermissionsBitField, ChannelType, AttachmentBuilder, UserSelectMenuBuilder, MessageFlags
} = require('discord.js');

// Importación de Helpers de Base de Datos
const {
    getCategoryByName, createTicketDB, updateTicketChannel,
    closeTicketDB, getTicketByChannel, assignTicket, logTicketActionDB
} = require('./ticketDB');

const { getGuildSettings } = require('./dataHandler');

// =============================================================================
//                             HELPERS (UI & UTILS)
// =============================================================================

/**
 * Genera la fila de botones de control para un ticket (Claim, Transfer, Close).
 * @param {boolean} isClaimed - Si el ticket ya tiene dueño asignado.
 * @return {ActionRowBuilder} Fila de componentes Discord.
 */
function getTicketControls(isClaimed) {
    const row = new ActionRowBuilder();

    // BOTÓN 1: RECLAMAR
    // Solo visible (útil) si no está reclamado.
    if (!isClaimed) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('claim_ticket')
                .setLabel('Reclamar Ticket')
                .setEmoji('🙋‍♂️')
                .setStyle(ButtonStyle.Success)
        );
    }

    // BOTÓN 2: TRANSFERIR
    // Habilitado solo si YA está reclamado (para pasar la bola).
    row.addComponents(
        new ButtonBuilder()
            .setCustomId('transfer_ticket')
            .setLabel('Transferir')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!isClaimed) // Desactivado si nadie lo reclamó aún
    );

    // BOTÓN 3: CERRAR
    // Siempre disponible (con confirmación posterior).
    row.addComponents(
        new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Cerrar Ticket')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Danger)
    );

    return row;
}

/**
 * Busca el mensaje "Principal" del bot dentro del canal de ticket.
 * Útil cuando la interacción proviene de un mensaje efímero y necesitamos editar el embed original del canal.
 * @param {TextChannel} channel - El canal del ticket.
 */
async function getMainTicketMessage(channel) {
    try {
        const messages = await channel.messages.fetch({ limit: 10 });
        // Retorna el primer mensaje del BOT que tenga Embeds (asumimos que es el de bienvenida)
        return messages.find(m => m.author.id === channel.client.user.id && m.embeds.length > 0);
    } catch (e) { return null; }
}

/**
 * Envía un Embed de Log al canal configurado en el servidor (Discord Log).
 * @param {Guild} guild - Servidor de Discord.
 * @param {string} action - Nombre de la acción (Ej: "Ticket Reclamado").
 * @param {TextChannel} ticketChannel - Canal donde ocurrió.
 * @param {User} executor - Usuario que ejecutó la acción.
 * @param {string} target - (Opcional) Usuario objetivo (ej: al transferir).
 */
async function logTicketActionDiscord(guild, action, ticketChannel, executor, target = null) {
    try {
        const settings = await getGuildSettings(guild.id);
        if (settings && settings.ticketLogsChannel) {
            const logChannel = guild.channels.cache.get(settings.ticketLogsChannel);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setTitle(`Ticket Log: ${action}`)
                    .setDescription(`**Canal:** ${ticketChannel}\n**Ejecutado por:** ${executor}\n${target ? `**Objetivo:** ${target}` : ''}`)
                    .setColor(0xF1C40F) // Color Amarillo Log
                    .setTimestamp();
                await logChannel.send({ embeds: [embed] });
            }
        }
    } catch (e) {
        console.error("Error logging ticket action (Discord):", e);
    }
}

// =============================================================================
//                             LÓGICA PRINCIPAL (ROUTER)
// =============================================================================

/**
 * Manejador central de interacciones de Tickets.
 * Recibe Botones y SelectMenus relacionados al sistema.
 */
async function handleTicketInteraction(interaction) {
    const { customId, guild, user, member, channel } = interaction;

    // --- CASO 1: CREAR TICKET (Botón del Panel) ---
    if (customId.startsWith('create_ticket_')) {
        const categoryName = customId.replace('create_ticket_', '');
        return await createTicketProcess(interaction, categoryName);
    }

    // --- VALIDACIONES COMUNES PARA ACCIONES DENTRO DE UN TICKET ---

    // 1. Verificar si el canal actual es un ticket valido en DB
    const ticket = await getTicketByChannel(channel.id);
    if (!ticket) {
        return interaction.reply({ content: "❌ Error de integridad: Este canal no figura en la base de datos de tickets.", flags: [MessageFlags.Ephemeral] });
    }

    // 2. Determinar si el usuario es STAFF autorizado para esta categoría
    const categoryData = await getCategoryByName(guild.id, ticket.type);
    let allowedRoles = [];
    try {
        // Soporte legacy: si es string lo convierte a array, si es JSON parsea
        allowedRoles = categoryData.roleId.startsWith('[') ? JSON.parse(categoryData.roleId) : [categoryData.roleId];
    } catch (e) {
        allowedRoles = [categoryData.roleId];
    }

    const isStaff = allowedRoles.some(r => member.roles.cache.has(r)) || member.permissions.has(PermissionsBitField.Flags.Administrator);
    // Nota: El dueño del ticket (ticket.userId) tiene permisos base, pero NO es staff (isStaff = false para él).

    // --- ROUTER DE ACCIONES ---

    switch (customId) {
        case 'claim_ticket':
            return await executeClaim(interaction, ticket, isStaff);

        case 'transfer_ticket':
            return await requestTransfer(interaction, ticket, isStaff);

        case 'confirm_transfer_select':
            // El valor seleccionado viene en interaction.values (Array)
            return await executeTransfer(interaction, ticket, interaction.values[0]);

        case 'close_ticket':
            return await requestClose(interaction, ticket, isStaff);

        case 'confirm_close':
            return await executeClose(interaction, ticket);

        case 'cancel_close':
            return await interaction.update({ content: '❌ Operación cancelada.', components: [] });

        default:
            return; // No es una acción conocida
    }
}

// =============================================================================
//                             SUB-RUTINAS DE ACCIÓN
// =============================================================================

/**
 * Proceso de creación de un nuevo Ticket.
 */
async function createTicketProcess(interaction, categoryName) {
    try {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        // 1. Obtener datos de Categoría
        const categoryData = await getCategoryByName(interaction.guild.id, categoryName);
        if (!categoryData) return interaction.editReply({ content: "❌ Error: La categoría configurada ya no existe." });

        // 2. Insertar en DB (Estado: OPEN)
        const ticketId = await createTicketDB(interaction.guild.id, interaction.user.id, categoryName);
        if (!ticketId) return interaction.editReply({ content: "❌ Error fatal de Base de Datos." });

        // Log DB: Apertura
        await logTicketActionDB(ticketId, 'OPEN', interaction.user.id);

        // 3. Calcular nombre de canal (ticket-000X)
        const paddedId = ticketId.toString().padStart(4, '0');
        const channelName = `ticket-${paddedId}`;

        // 4. Configurar Permisos del Canal
        let allowedRolesIds = [];
        try { allowedRolesIds = categoryData.roleId.startsWith('[') ? JSON.parse(categoryData.roleId) : [categoryData.roleId]; } catch (e) { allowedRolesIds = [categoryData.roleId]; }

        const permissionOverwrites = [
            { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }, // @everyone: Deny
            { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }, // Dueño: Allow
            { id: interaction.client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] } // Bot: Allow
        ];

        // Añadir permisos para cada rol de Staff configurado
        allowedRolesIds.forEach(rId => {
            permissionOverwrites.push({ id: rId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
        });

        // 5. Crear Canal de Texto
        const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: categoryData.targetCategoryId || null,
            permissionOverwrites
        });

        // Actualizar DB con el ID real del canal
        await updateTicketChannel(ticketId, ticketChannel.id);

        // 6. Enviar Mensaje de Bienvenida (Embed)
        const embed = new EmbedBuilder()
            .setTitle(`${categoryData.emoji || '🎫'} ${categoryName} | Ticket #${paddedId}`)
            .setDescription(`Hola <@${interaction.user.id}>, bienvenido al soporte.\n\n**Instrucciones:**\n> Por favor explicá tu situación detalladamente.\n> El equipo de Staff te atenderá a la brevedad.`)
            .setColor(0xF1C40F) // COLOR AMARILLO (Sin Asignar)
            .setFooter({ text: "Capi Netta System • Soporte Seguro" })
            .setTimestamp();

        // Botones iniciales (Sin reclamar)
        const row = getTicketControls(false);

        // Enviar mensaje mencionando al usuario (sin mencionar rol para no spa-mear)
        await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });

        await interaction.editReply({ content: `✅ Ticket creado exitosamente: ${ticketChannel}` });

    } catch (e) {
        console.error(e);
        await interaction.editReply({ content: "❌ Ocurrió un error inesperado al intentar crear el canal." });
    }
}

/**
 * Ejecuta la lógica de RECLAMAR (CLAIM) un ticket.
 */
async function executeClaim(interaction, ticket, isStaff) {
    if (!isStaff) return interaction.reply({ content: "🚫 Solo el Staff autorizado puede reclamar tickets.", flags: [MessageFlags.Ephemeral] });

    const { channel, user, guild } = interaction;

    // 1. Actualizar DB
    await assignTicket(channel.id, user.id);
    await logTicketActionDB(ticket.ticketId, 'CLAIM', user.id); // DB Stat
    await logTicketActionDiscord(guild, "Ticket Reclamado", channel, user); // Discord Log

    // 2. Actualizar UI (Embed -> Verde, Botones -> Transfer habilitado)
    // El mensaje original es interaction.message ya que "claim_ticket" es un botón directo en el mensaje
    const oldEmbed = interaction.message.embeds[0];
    const newEmbed = EmbedBuilder.from(oldEmbed)
        .addFields({ name: "🧑‍💼 Asignado a", value: `${user}`, inline: false })
        .setColor(0x2ECC71); // COLOR VERDE

    const newRow = getTicketControls(true); // isClaimed = true

    await interaction.update({ embeds: [newEmbed], components: [newRow] });
    return channel.send({ content: `✅ **${user.username}** ha tomado este ticket.` });
}

/**
 * Inicia el proceso de TRANSFERENCIA (Muestra menú de selección de usuario).
 */
async function requestTransfer(interaction, ticket, isStaff) {
    if (!isStaff) return interaction.reply({ content: "🚫 Acción exclusiva para Staff.", flags: [MessageFlags.Ephemeral] });

    // Regla: Solo el dueño actual del reclamo o un admin pueden transferir
    const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
    if (ticket.claimedBy && ticket.claimedBy !== interaction.user.id && !isAdmin) {
        return interaction.reply({ content: `🚫 Este ticket pertenece a <@${ticket.claimedBy}>. Solo él o Dirección pueden transferirlo.`, flags: [MessageFlags.Ephemeral] });
    }

    // Mostrar componente UserSelectMenu (nativo de Discord)
    const userSelect = new UserSelectMenuBuilder()
        .setCustomId('confirm_transfer_select')
        .setPlaceholder('Selecciona al nuevo encargado...')
        .setMaxValues(1);

    const row = new ActionRowBuilder().addComponents(userSelect);
    return interaction.reply({ content: "Selecciona al miembro del staff a quien transferir:", components: [row], flags: [MessageFlags.Ephemeral] });
}

/**
 * Ejecuta la TRANSFERENCIA una vez seleccionado el usuario destino.
 */
async function executeTransfer(interaction, ticket, targetUserId) {
    const { channel, user, guild } = interaction;

    // 1. Actualizar DB
    await assignTicket(channel.id, targetUserId);
    await logTicketActionDB(ticket.ticketId, 'TRANSFER', user.id, targetUserId);
    await logTicketActionDiscord(guild, "Ticket Transferido", channel, user, `<@${targetUserId}>`);

    // 2. Actualizar UI (Embed -> Azul)
    // Al ser una respuesta a un mensaje efímero, debemos buscar el mensaje original en el canal
    const mainMsg = await getMainTicketMessage(channel);
    if (mainMsg) {
        const oldEmbed = mainMsg.embeds[0];
        // Filtramos campo anterior de asignación si existe
        const newFields = oldEmbed.fields.filter(f => f.name !== "🧑‍💼 Asignado a");
        newFields.push({ name: "🧑‍💼 Asignado a", value: `<@${targetUserId}>`, inline: false });

        const newEmbed = EmbedBuilder.from(oldEmbed)
            .setFields(newFields)
            .setColor(0x3498DB); // COLOR AZUL

        await mainMsg.edit({ embeds: [newEmbed] }); // Edición directa del mensaje
    }

    channel.send({ content: `🔄 Ticket transferido a <@${targetUserId}> por ${user}.` });
    return interaction.update({ content: `✅ Operación exitosa. Transferido a <@${targetUserId}>.`, components: [] });
}

/**
 * Inicia solicitud de CIERRE (Pide confirmación).
 */
async function requestClose(interaction, ticket, isStaff) {
    // Regla de Seguridad: Si está reclamado, solo el asignado o Admin puede cerrar.
    const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (ticket.claimedBy && ticket.claimedBy !== interaction.user.id && !isAdmin) {
        return interaction.reply({ content: `🚫 Reclamado por <@${ticket.claimedBy}>. Solo él puede cerrarlo.`, flags: [MessageFlags.Ephemeral] });
    }

    // Validación básica: Staff o Dueño del Ticket
    const isOwner = ticket.userId === interaction.user.id;
    if (!isOwner && !isStaff) return interaction.reply({ content: "🚫 No tienes permisos para cerrar este ticket.", flags: [MessageFlags.Ephemeral] });

    // Botones de Confirmación
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm_close').setLabel('Sí, cerrar ticket').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('cancel_close').setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
    );
    return interaction.reply({ content: '❓ **¿Confirmas que deseas cerrar y archivar este ticket?**', components: [row], flags: [MessageFlags.Ephemeral] });
}

/**
 * Ejecuta el CIERRE definitivo: Log, Transcript, DB Close y Delete Channel.
 */
// Importar librería de transcripts HTML
const discordTranscripts = require('discord-html-transcripts');

/**
 * Ejecuta el CIERRE definitivo: Log, Transcript, DB Close y Delete Channel.
 */
async function executeClose(interaction, ticket) {
    const { channel, guild, user } = interaction;
    await interaction.update({ content: '🔒 Procesando cierre y generando transcript...', components: [] });

    // 1. Log DB acción de cierre
    await logTicketActionDB(ticket.ticketId, 'CLOSE', user.id);

    try {
        let attachment = null;

        // 2. Generar Transcript (HTML Profesional)
        attachment = await discordTranscripts.createTranscript(channel, {
            limit: -1, // Exportar todos los mensajes
            returnType: 'attachment', // Retorna un AttachmentBuilder
            filename: `transcript-${channel.name}.html`, // Nombre del archivo
            saveImages: true, // Descargar imágenes
            footerText: `Exportado el {date} | Capi Netta RP`,
            poweredBy: false // Ocultar "Powered by discord-html-transcripts"
        });

        // 3. Enviar Log a Discord (Canal de Logs)
        const settings = await getGuildSettings(guild.id);
        if (settings && settings.ticketLogsChannel) {
            const logChannel = guild.channels.cache.get(settings.ticketLogsChannel);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle("📝 Ticket Cerrado")
                    .addFields(
                        { name: "Ticket", value: channel.name, inline: true },
                        { name: "Autor", value: ticket ? `<@${ticket.userId}>` : "Desconocido", inline: true },
                        { name: "Cerrado por", value: `<@${user.id}>`, inline: true },
                        { name: "Reclamado por", value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : "Nadie", inline: true }
                    )
                    .setColor(0xE74C3C) // COLOR ROJO
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed], files: [attachment] });
            }
        }

        // 4. Enviar DM al usuario (Copia del transcript)
        try { // Intentamos buscar al usuario si sigue en el server
            const ticketUser = await guild.members.fetch(ticket.userId).catch(() => null);
            if (ticketUser) {
                await ticketUser.send({
                    content: `👋 Tu ticket **${channel.name}** en **${guild.name}** ha sido cerrado. Te adjunto el historial de la conversación.`,
                    files: [attachment]
                });
            }
        } catch (dmErr) {
            console.log(`No se pudo enviar MD al usuario ${ticket.userId}.`);
        }

    } catch (err) {
        console.error("Error durante el proceso de cierre/transcript:", err);
    }

    // 5. Cerrar en DB y Borrar Canal
    await closeTicketDB(channel.id);

    // Timer de seguridad para asegurar que el mensaje de "Procesando..." se lea
    setTimeout(() => {
        channel.delete().catch(() => { });
    }, 5000);
}

module.exports = { handleTicketInteraction };
