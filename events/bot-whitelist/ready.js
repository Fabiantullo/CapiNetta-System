const { REST, Routes } = require("discord.js");
const config = require("../../config");

module.exports = {
    name: "clientReady",
    once: true,
    async execute(client) {
        console.log(`✅ [Whitelist] Bot conectado como ${client.user.tag}`);

        // Registrar comandos específicos de whitelist
        // Nota: Esto podría moverse a un deploy-commands separado si se prefiere
        const commands = client.commands.map(cmd => cmd.data.toJSON());

        // Solo registrar si hay comandos
        if (commands.length > 0) {
            const rest = new REST({ version: "10" }).setToken(config.whitelist.token);
            try {
                await rest.put(
                    Routes.applicationGuildCommands(config.whitelist.clientId, config.whitelist.guildId),
                    { body: commands }
                );
                console.log("✅ [Whitelist] Slash commands registrados");
            } catch (err) {
                console.error("❌ [Whitelist] Error registrando comandos:", err);
            }
        }
    },
};
