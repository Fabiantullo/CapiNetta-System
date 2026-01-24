const { MessageFlags } = require("discord.js");
const config = require("../../config").general;
const { sendLog, logError } = require("../../utils/logger");
const { getGuildSettings } = require("../../utils/dataHandler");
const { handleTicketInteraction } = require("../../utils/ticketSystem");

module.exports = {
    name: "interactionCreate",
    async execute(client, interaction) {
        // 0. Manejo de Tickets (Botones y Menús)
        if (interaction.isButton() || interaction.isStringSelectMenu()) {
            if (interaction.customId.startsWith('ticket_') ||
                interaction.customId.startsWith('create_ticket_') ||
                ['close_ticket', 'confirm_close', 'cancel_close'].includes(interaction.customId)) {

                // Mapeo para el Select Menu
                if (interaction.customId === 'ticket_category_select') {
                    const categoryName = interaction.values[0].replace('create_ticket_', '');
                    interaction.customId = `create_ticket_${categoryName}`;
                }

                return await handleTicketInteraction(interaction);
            }
        }

        // 1. Manejo de Comandos Slash
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

        // 2. Manejo del Botón de Verificación
        if (interaction.isButton() && interaction.customId === "verify") {
            const member = interaction.member;
            const guildId = interaction.guild.id;

            // Buscamos la configuración dinámica de este servidor
            const settings = await getGuildSettings(guildId);

            if (!settings || !settings.isSetup) {
                return interaction.reply({
                    content: "⚠️ Este servidor no ha sido configurado. Avisale a un administrador que use `/setup`.",
                    flags: [MessageFlags.Ephemeral]
                });
            }

            // Verificamos si ya tiene el rol de usuario de ESTE servidor
            if (member.roles.cache.has(settings.roleUser)) {
                return interaction.reply({
                    content: "⚠️ Ya te encontrás verificado en el servidor.",
                    flags: [MessageFlags.Ephemeral]
                });
            }

            // Lógica de tiempo de espera (minVerifyMinutes sigue siendo global del config)
            const MIN_TIME = config.minVerifyMinutes * 60 * 1000;
            const timePassed = Date.now() - member.joinedTimestamp;

            if (timePassed < MIN_TIME) {
                const timeLeft = Math.ceil((MIN_TIME - timePassed) / 1000);
                return interaction.reply({
                    content: `⏳ Debés esperar **${timeLeft} segundos** más para verificar tu cuenta.`,
                    flags: [MessageFlags.Ephemeral]
                });
            }

            try {
                // Quitar rol sin verificar y poner usuario específicos de este server
                if (settings.roleNoVerify) await member.roles.remove(settings.roleNoVerify).catch(() => { });
                await member.roles.add(settings.roleUser).catch(() => { });

                await interaction.reply({
                    content: "✅ Te has verificado correctamente. ¡Bienvenido/a!",
                    flags: [MessageFlags.Ephemeral]
                });

                sendLog(client, interaction.user, `✅ **${interaction.user.tag}** completó la verificación.`, guildId);
            } catch (err) {
                logError(client, err, "Error en proceso de verificación", guildId);
                await interaction.reply({ content: "❌ Hubo un error al asignar tus roles. Contactá al staff.", flags: [MessageFlags.Ephemeral] });
            }
        }
    },
};