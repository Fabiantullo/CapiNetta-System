const { MessageFlags } = require("discord.js");
const config = require("../../config").general;
const { sendLog, logError } = require("../../utils/logger");

module.exports = {
    name: "interactionCreate",
    async execute(client, interaction) {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction);
            } catch (error) {
                logError(client, error, `Command: ${interaction.commandName}`);
            }
            return;
        }

        if (interaction.isButton() && interaction.customId === "verify") {
            const member = interaction.member;
            if (member.roles.cache.has(config.roleUser)) {
                return interaction.reply({ content: "⚠️ Ya estás verificado.", flags: [MessageFlags.Ephemeral] });
            }

            const MIN_TIME = config.minVerifyMinutes * 60 * 1000;
            const timePassed = Date.now() - member.joinedTimestamp;

            if (timePassed < MIN_TIME) {
                const timeLeft = Math.ceil((MIN_TIME - timePassed) / 1000);
                return interaction.reply({ content: `⏳ Esperá **${timeLeft} segundos**...`, flags: [MessageFlags.Ephemeral] });
            }

            await member.roles.remove(config.roleNoVerify).catch(() => { });
            await member.roles.add(config.roleUser).catch(() => { });

            await interaction.reply({ content: "✅ Verificado correctamente.", flags: [MessageFlags.Ephemeral] });
            sendLog(client, interaction.user, `✅ **${interaction.user.tag}** se verificó.`);
        }
    },
};