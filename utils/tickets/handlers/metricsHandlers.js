/**
 * @file metricsHandlers.js
 * @description Controlador para visualización de KPIs y Estadísticas.
 */

const { EmbedBuilder, MessageFlags } = require('discord.js');
const { getTicketMetrics } = require('../db/metrics');

async function handleMetrics(interaction) {
    const metrics = await getTicketMetrics(interaction.guild.id);
    if (!metrics) {
        return interaction.reply({ content: "❌ Error obteniendo métricas.", flags: [MessageFlags.Ephemeral] });
    }

    const hours = Math.floor(metrics.avgResolutionTime / 60);
    const minutes = metrics.avgResolutionTime % 60;
    const timeString = `${hours}h ${minutes}m`;

    const staffGraph = metrics.ticketsByStaff.length > 0
        ? metrics.ticketsByStaff.map((s, i) => `${['🥇', '🥈', '🥉'][i] || '🏅'} <@${s.claimedBy}>: **${s.count}** tickets`).join('\n')
        : "Sin datos de Staff.";

    const catGraph = metrics.ticketsByCategory.length > 0
        ? metrics.ticketsByCategory.map(c => `**${c.type}**: ${c.count}`).join('\n')
        : "Sin tickets creados.";

    const embed = new EmbedBuilder()
        .setTitle("📊 Rendimiento de Soporte | Tickets KPIs")
        .setColor(0x9b59b6)
        .addFields(
            { name: "⏱️ Tiempo Promedio Resolución", value: `\`${timeString}\``, inline: true },
            { name: "📂 Volumen por Categoría", value: catGraph, inline: true },
            { name: "🏆 Top Staff (Tickets Resueltos)", value: staffGraph, inline: false }
        )
        .setFooter({ text: "Capi Netta Analytics" })
        .setTimestamp();

    return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
}

module.exports = { handleMetrics };
