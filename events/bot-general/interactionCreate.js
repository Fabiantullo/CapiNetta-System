const config = require("../../config").general;
const { sendLog, logError } = require("../../utils/logger");

const MIN_TIME_TO_VERIFY = config.minVerifyMinutes * 60 * 1000;

module.exports = {
    name: "interactionCreate",
    async execute(client, interaction) {
        console.log(`📨 [Debug] Interacción recibida: ${interaction.commandName || interaction.customId} (Tipo: ${interaction.type})`);
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            console.log(`🔎 [Debug] Buscando comando '${interaction.commandName}': ${command ? "Encontrado" : "NO ENCONTRADO"}`);

            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                logError(client, error, `Command: ${interaction.commandName}`);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'Hubo un error al ejecutar este comando!', ephemeral: true }).catch(() => { });
                } else {
                    await interaction.reply({ content: 'Hubo un error al ejecutar este comando!', ephemeral: true }).catch(() => { });
                }
            }
            return;
        }

        if (!interaction.isButton() || interaction.customId !== "verify") return;

        const member = interaction.member;

        if (member.roles.cache.has(config.roleUser)) {
            return interaction.reply({
                content: "⚠️ Ya estás verificado.",
                ephemeral: true
            });
        }

        const timePassed = Date.now() - member.joinedTimestamp;

        if (timePassed < MIN_TIME_TO_VERIFY) {
            const timeLeftMs = MIN_TIME_TO_VERIFY - timePassed;
            const timeLeft = Math.ceil(timeLeftMs / 1000);

            await interaction.deferReply({ ephemeral: true });

            await interaction.editReply({
                content: `⏳ Esperá **${timeLeft} segundos** para poder verificarte...`
            });

            setTimeout(() => {
                interaction.editReply({
                    content: "✅ ¡Ya podés verificarte! Tocá el botón nuevamente."
                }).catch(err => logError(client, err, "Interaction Timeout Edit"));
            }, timeLeftMs);

            return;
        }

        await member.roles.remove(config.roleNoVerify).catch(err => logError(client, err, "Remove Role NoVerify"));
        await member.roles.add(config.roleUser).catch(err => logError(client, err, "Add Role User"));

        await interaction.reply({
            content: "✅ Tu verificación fue completada. ¡Bienvenido a **Capi Netta RP**!",
            ephemeral: true
        });

        sendLog(client, interaction.user, `✅ **${interaction.user.tag}** se verificó correctamente`);
    },
};
