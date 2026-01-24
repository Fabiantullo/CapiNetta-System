/**
 * @file history.js
 * @description Comando de Auditoría. Permite ver el historial de sanciones pasadas de un usuario.
 * Consulta la tabla `warn_logs` en Base de Datos.
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const pool = require('../../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('history')
        .setDescription('Muestra el historial de advertencias detallado de un usuario')
        .addUserOption(opt => opt.setName('usuario').setDescription('El usuario a consultar').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const user = interaction.options.getUser('usuario');

        // Consultamos los últimos 10 incidentes
        const [logs] = await pool.query(
            'SELECT * FROM warn_logs WHERE userId = ? ORDER BY timestamp DESC LIMIT 10',
            [user.id]
        );

        if (logs.length === 0) {
            return interaction.reply({ content: `✅ **${user.tag}** tiene el expediente limpio (Sin registros en DB).`, flags: [MessageFlags.Ephemeral] });
        }

        // Construcción del Embed con formato de lista
        const embed = new EmbedBuilder()
            .setTitle(`📜 Historial de Sanciones: ${user.tag}`)
            .setColor(0xf1c40f)
            .setThumbnail(user.displayAvatarURL())
            .setDescription(
                logs.map((l, i) =>
                    `**#${logs.length - i}** | <t:${Math.floor(l.timestamp / 1000)}:R>\n**Mod:** <@${l.moderatorId}>\n**Razón:** ${l.reason}`
                ).join('\n\n')
            )
            .setFooter({ text: `Consultado por ${interaction.user.username} • Mostrando últimos 10` });

        await interaction.reply({ embeds: [embed] });
    },
};