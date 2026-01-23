const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { logError } = require('../../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('debug-test')
        .setDescription('Fuerza un error para probar el sistema de logs de estado')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            // Forzamos un error de referencia para la prueba
            throw new Error("Test de sistema: Verificando canal de errores dinámico.");
        } catch (error) {
            // Usamos el nuevo logError con el cliente y el guildId
            const { logError } = require('../../../utils/logger');
            await logError(interaction.client, error, "Comando Debug-Test", interaction.guild.id);

            await interaction.reply({ content: "🚨 Error de prueba enviado al canal de estado/logs.", ephemeral: true });
        }
    },
};