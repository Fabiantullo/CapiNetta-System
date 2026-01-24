/**
 * @file history.js
 * @description Muestra el historial de sanciones de un usuario.
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { prisma } = require('../../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('history')
        .setDescription('Consulta el historial de advertencias de un usuario')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a consultar').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('usuario');

        try {
            const history = await prisma.warnLog.findMany({
                where: { userId: targetUser.id },
                orderBy: { timestamp: 'desc' },
                take: 10 // Últimos 10
            });

            if (history.length === 0) {
                return interaction.reply({ content: `✅ **${targetUser.tag}** no tiene antecedentes registrados.`, flags: [MessageFlags.Ephemeral] });
            }

            const embed = new EmbedBuilder()
                .setTitle(`📜 Historial de: ${targetUser.tag}`)
                .setColor(0xE67E22)
                .setThumbnail(targetUser.displayAvatarURL())
                .setFooter({ text: "Mostrando últimos 10 registros" });

            // Mapeamos los resultados de Prisma
            const description = history.map(log => {
                const date = log.timestamp.toLocaleDateString(); // Prisma returns Date objects
                return `**[${date}] Warn #${log.warnNumber}**\n👮 Mod: <@${log.moderatorId}>\n📝 Razón: *${log.reason}*`;
            }).join('\n\n');

            embed.setDescription(description);

            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });

        } catch (error) {
            console.error("Error fetching history:", error);
            return interaction.reply({ content: "❌ Error consultando el historial.", flags: [MessageFlags.Ephemeral] });
        }
    }
};