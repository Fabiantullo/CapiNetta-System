const { EmbedBuilder } = require("discord.js");
const { logError } = require("../../utils/logger");

module.exports = {
    name: "clientReady", // Cambiado de 'ready'
    once: true,
    async execute(client) {
        console.log(`✅ Capi Netta RP [Whitelist] está online.`);

        // Agregamos la misma lógica de seguridad para pins si la usás acá
        // Asegurate de que si tenés lógica de pins en este archivo, uses Array.from()
    },
};