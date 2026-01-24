/**
 * @file ping.js
 * @description Comando de utilidad básico para verificar latencia y estado del bot.
 */

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Responde con Pong! (Test de conectividad)'),
    async execute(interaction) {
        await interaction.reply('Pong! 🏓');
    },
};
