const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { saveWarnToDB, addWarnLog } = require('../../../utils/dataHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Advierte a un usuario y guarda registro.')
        .addUserOption(opt => opt.setName('usuario').setDescription('El usuario').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Razón'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('razon') || 'Sin razón específica';
        const moderator = interaction.user;
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member || user.bot) return interaction.reply({ content: 'Usuario no válido.', ephemeral: true });

        const { client } = interaction;
        const currentWarns = (client.warnMap.get(user.id) || 0) + 1;

        // Guardar estado actual y Log histórico
        client.warnMap.set(user.id, currentWarns);
        await saveWarnToDB(user.id, currentWarns);
        await addWarnLog(user.id, moderator.id, reason, currentWarns);

        if (currentWarns < 3) {
            await interaction.reply(`⚠️ **${user.tag}** advertido (${currentWarns}/3).`);
            await user.send(`⚠️ Has sido advertido en **${interaction.guild.name}** por: ${reason}`).catch(() => { });
        } else {
            if (member.moderatable) {
                await member.timeout(10 * 60 * 1000, `3 Warns. Última: ${reason}`);
                await interaction.reply(`🔇 **${user.tag}** silenciado 10m por acumulación de warns.`);
                client.warnMap.delete(user.id);
                await saveWarnToDB(user.id, 0);
            }
        }
    },
};