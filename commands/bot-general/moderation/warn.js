const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { saveWarns } = require('../../../utils/dataHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Advierte a un usuario.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario a advertir')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('razon')
                .setDescription('Razón de la advertencia'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('razon') || 'Sin razón específica';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) {
            return interaction.reply({ content: 'Usuario no encontrado en el servidor.', ephemeral: true });
        }

        if (user.bot) {
            return interaction.reply({ content: 'No puedes advertir a un bot.', ephemeral: true });
        }

        // Obtener warns actuales
        const { client } = interaction;
        const currentWarns = (client.warnMap.get(user.id) || 0) + 1;
        client.warnMap.set(user.id, currentWarns);
        saveWarns(client.warnMap);

        if (currentWarns < 3) {
            await interaction.reply(`⚠️ **${user.tag}** ha sido advertido. Razón: ${reason} (**${currentWarns}/3**)`);
            // Intentar avisar al usuario por MD
            await user.send(`⚠️ Has recibido una advertencia en **${interaction.guild.name}**.\n**Razón:** ${reason}\n**Contador:** ${currentWarns}/3`).catch(() => { });
        } else {
            // Warn 3: Timeout
            if (member.moderatable) {
                await member.timeout(10 * 60 * 1000, `Acumulación de advertencias (${currentWarns}/3). Ultima razón: ${reason}`).catch(() => {
                    return interaction.reply({ content: 'No pude dar timeout al usuario (falta de permisos), pero se registró la advertencia.', ephemeral: true });
                });
                await interaction.reply(`🔇 **${user.tag}** ha sido silenciado por 10 minutos por acumulación de advertencias (**${currentWarns}/3**).`);

                // Reset warns
                client.warnMap.delete(user.id);
                saveWarns(client.warnMap);
            } else {
                await interaction.reply(`⚠️ **${user.tag}** alcanzó 3 advertencias pero no tengo permisos para darle timeout.`);
            }
        }
    },
};
