/**
 * @file debug-test.js
 * @description Comando de desarrollo para probar el sistema de reporte de errores.
 * Fuerza una excepción controlada para verificar que el logger envíe la alerta a Discord.
 */

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('debug-test')
        .setDescription('Fuerza un error para probar el sistema de logs de estado')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            // Generamos un error artificial
            throw new Error("Simulación: Fallo crítico de prueba iniciado por admin.");
        } catch (error) {
            // Importación bajo demanda para evitar ciclos si fuera necesario
            const { logError } = require('../../../utils/logger');

            // Enviamos el error al sistema de logs
            await logError(interaction.client, error, "Comando Debug-Test", interaction.guild.id);

            await interaction.reply({
                content: "🚨 Excepción lanzada. Verificá si llegó al canal de logs/debug configurado.",
                flags: [MessageFlags.Ephemeral]
            });
        }
    },
};