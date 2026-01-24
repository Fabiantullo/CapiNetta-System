/**
 * @file warn.js
 * @description Comando de Advertencia.
 * - Registra una falta leve a un usuario.
 * - Acumula contadores en DB.
 * - Al llegar a 3 warns, aplica un Mute/Timeout automático de 10 minutos.
 */

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { saveWarnToDB, addWarnLog } = require('../../../utils/dataHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Advierte a un usuario y guarda registro.')
        .addUserOption(opt => opt.setName('usuario').setDescription('El usuario a sancionar').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Motivo de la advertencia'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('razon') || 'Sin razón específica';
        const moderator = interaction.user;

        // Fetch del miembro para poder aplicar timeouts
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member || user.bot) {
            return interaction.reply({ content: '❌ Usuario no válido o es un bot.', flags: [MessageFlags.Ephemeral] });
        }

        const { client } = interaction;

        // Obtener contador anterior del mapa en memoria (fallback 0)
        let currentWarns = (client.warnMap.get(user.id) || 0) + 1;

        // 1. Guardar Log Histórico y Estado
        client.warnMap.set(user.id, currentWarns);
        await saveWarnToDB(user.id, currentWarns); // DB Persistente
        await addWarnLog(user.id, moderator.id, reason, currentWarns); // Log Auditoría

        // 2. Lógica de Sanción Escalonada
        if (currentWarns < 3) {
            // Nivel Leve: Solo aviso
            await interaction.reply(`⚠️ **${user.tag}** ha sido advertido. (Advertencia ${currentWarns}/3)`);

            // Notificar al DM del usuario
            try {
                await user.send(`⚠️ Has recibido una advertencia en **${interaction.guild.name}**\n**Razón:** ${reason}`);
            } catch (e) { /* DM cerrado */ }

        } else {
            // Nivel Crítico (3+): Timeout Automático
            if (member.moderatable) {
                try {
                    // Timeout de 10 minutos
                    await member.timeout(10 * 60 * 1000, `Acumulación de 3 Warns. Última: ${reason}`);

                    await interaction.reply(`🔇 **${user.tag}** alcanzó 3 advertencias y fue silenciado temporalmente (10 min).`);

                    // Resetear contador tras castigo cumplido (estrategia opcional)
                    client.warnMap.set(user.id, 0);
                    await saveWarnToDB(user.id, 0);
                } catch (err) {
                    await interaction.reply(`⚠️ Warn registrado (${currentWarns}), pero no pude aplicar timeout (Error de jerarquía).`);
                }
            } else {
                await interaction.reply(`⚠️ Warn registrado (${currentWarns / 3}). No puedo sancionar al usuario (Jerarquía superior).`);
            }
        }
    },
};