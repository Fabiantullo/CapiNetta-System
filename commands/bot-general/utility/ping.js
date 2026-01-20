const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Responde con Pong! (Test de Capi Netta)'),
    async execute(interaction) {
        await interaction.reply('Pong!');
    },
};
