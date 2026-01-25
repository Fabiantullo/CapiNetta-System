/**
 * @file interactionCreate.js
 * @description Manejador global de interacciones (Comandos Slsh, Botones, SelectMenus).
 * Actúa como router principal:
 * 1. Desvía acciones de Ticket a `ticketSystem.js`.
 * 2. Ejecuta comandos Slash.
 * 3. Maneja botones especiales (como verificación rápida).
 */

const { MessageFlags } = require("discord.js");
const config = require("../../config").general;
const { sendLog, logError } = require("../../utils/logger");
const { getGuildSettings } = require("../../utils/dataHandler");
const { handleTicketInteraction } = require("../../utils/tickets");

module.exports = {
    name: "interactionCreate",

    /**
     * Ejecuta la lógica al recibir una interacción.
     * @param {Client} client 
     * @param {Interaction} interaction 
     */
    async execute(client, interaction) {

        // =====================================================================
        // 0. ENRUTAMIENTO DE SISTEMA DE TICKETS
        // =====================================================================
        // Verificamos si la interacción pertenece al ecosistema de Tickets.
        // Incluye: Botones de crear, cerrar, reclamar, transferir, y menús de selección.

        const isTicketInteraction =
            (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isUserSelectMenu()) &&
            (
                interaction.customId.startsWith('ticket_') ||
                interaction.customId.startsWith('create_ticket_') ||
                ['claim_ticket', 'transfer_ticket', 'confirm_transfer_select', 'close_ticket', 'confirm_close', 'cancel_close'].includes(interaction.customId)
            );

        if (isTicketInteraction) {
            // Caso especial: El SelectMenu de categoría a veces usa un ID genérico que remapeamos
            if (interaction.customId === 'ticket_category_select') {
                const categoryName = interaction.values[0].replace('create_ticket_', '');
                interaction.customId = `create_ticket_${categoryName}`;
            }

            // Delegamos toda la lógica al módulo especializado
            return await handleTicketInteraction(interaction);
        }

        // =====================================================================
        // 1. MANEJO DE COMANDOS SLASH (/comando)
        // =====================================================================
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction);
            } catch (error) {
                logError(client, error, `Comando: ${interaction.commandName}`, interaction.guild.id);
            }
            return;
        }

        // =====================================================================
        // 2. MANEJO DE BOTÓN DE VERIFICACIÓN (Sistema de Captcha simplificado)
        // =====================================================================
        if (interaction.isButton() && interaction.customId === "verify") {
            const member = interaction.member;
            const guildId = interaction.guild.id;

            // Obtener configuración del servidor
            const settings = await getGuildSettings(guildId);

            if (!settings || !settings.isSetup) {
                return interaction.reply({
                    content: "⚠️ Configuración incompleta. Contacte a admin (/setup).",
                    flags: [MessageFlags.Ephemeral]
                });
            }

            // Validación: ¿Ya verificado?
            if (member.roles.cache.has(settings.roleUser)) {
                return interaction.reply({
                    content: "⚠️ Ya estás verificado.",
                    flags: [MessageFlags.Ephemeral]
                });
            }

            // Validación: Tiempo mínimo de permanencia (Anti-Raid soft)
            const MIN_TIME = config.minVerifyMinutes * 60 * 1000;
            const timePassed = Date.now() - member.joinedTimestamp;

            if (timePassed < MIN_TIME) {
                const timeLeft = Math.ceil((MIN_TIME - timePassed) / 1000);
                return interaction.reply({
                    content: `⏳ Espera **${timeLeft} segundos** para verificar.`,
                    flags: [MessageFlags.Ephemeral]
                });
            }

            try {
                // Intercambio de roles: Quitar roleNoVerify, Poner roleUser
                if (settings.roleNoVerify) await member.roles.remove(settings.roleNoVerify).catch(() => { });
                await member.roles.add(settings.roleUser).catch(() => { });

                await interaction.reply({
                    content: "✅ Verificación exitosa. ¡Bienvenido!",
                    flags: [MessageFlags.Ephemeral]
                });

                sendLog(client, interaction.user, `✅ **${interaction.user.tag}** verificado.`, guildId);
            } catch (err) {
                logError(client, err, "Proceso Verificación", guildId);
                await interaction.reply({ content: "❌ Error de roles. Contacta Staff.", flags: [MessageFlags.Ephemeral] });
            }
        }
    },
};