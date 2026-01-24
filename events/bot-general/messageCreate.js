/**
 * @file messageCreate.js
 * @description Evento global de mensajes.
 * Implementa el módulo de ANTI-SCAM y ANTI-SPAM:
 * 1. Detecta menciones masivas (>10 usuarios).
 * 2. Detecta mensajes repetitivos (flood).
 * 3. Aplica sanciones automáticas (Aislamiento/Mute) y limpia el chat.
 */

const { logError, sendLog } = require("../../utils/logger");
const { saveUserRoles, getGuildSettings } = require("../../utils/dataHandler");

module.exports = {
    name: "messageCreate",
    async execute(client, message) {
        // Ignorar DMs y Bots
        if (!message.guild || message.author.bot) return;

        // Verificar si el servidor está configurado
        const settings = await getGuildSettings(message.guild.id);
        if (!settings || !settings.isSetup) return;

        // Detección de Amenazas
        const isScam = message.mentions.users.size > 10 || checkDuplicate(client, message);

        if (isScam) {
            try {
                // 1. Limpieza de Chat (Borrar últimos mensajes del usuario)
                const messages = await message.channel.messages.fetch({ limit: 10 });
                const spamMessages = messages.filter(m => m.author.id === message.author.id);

                await message.channel.bulkDelete(spamMessages).catch(() => {
                    message.delete().catch(() => { });
                });

                // 2. Aplicar Sanción de Aislamiento
                await applyScamSanction(
                    client,
                    message,
                    isScam === true ? "Mensajes repetitivos (Flood)" : "Menciones masivas (Mass Mention)",
                    settings
                );
            } catch (err) {
                logError(client, err, "Error limpiando spam", message.guild.id);
            }
        }
    },
};

/**
 * Aplica aislamiento al usuario: Guarda roles, quita roles, pone rol Muted.
 */
async function applyScamSanction(client, message, reason, settings) {
    const member = await message.guild.members.fetch(message.author.id).catch(() => null);

    // Si no se puede moderar (es admin/dueño), salir
    if (!member || !member.moderatable) return;

    // Guardar roles actuales (menos @everyone y Muted) para restaurar luego
    const rolesToSave = member.roles.cache
        .filter(r => r.id !== message.guild.id && r.id !== settings.roleMuted)
        .map(r => r.id);

    await saveUserRoles(message.guild.id, member.id, rolesToSave);

    // Aviso DM
    await member.send(`⚠️ Tu cuenta fue aislada preventivamente en **${message.guild.name}** por seguridad.`).catch(() => { });

    try {
        // Aplicar Rol de Aislamiento
        await member.roles.set([settings.roleMuted]);

        // Notificar en canal de Soporte
        const sChannel = await client.channels.fetch(settings.supportChannel).catch(() => null);
        if (sChannel) {
            await sChannel.send(`🚨 **<@${member.id}>**, tu cuenta ha sido restringida por: ${reason}. Revisá el mensaje fijado.`);
        }

        // Log de Auditoría
        await sendLog(client, member.user, `🛡️ **AISLAMIENTO**: ${member.user.tag} enviado a soporte por ${reason}.`, message.guild.id);
    } catch (err) {
        logError(client, err, "Aisolation Roles Error", message.guild.id);
    }
}

/**
 * Algoritmo simple de detección de Flood (mensajes idénticos consecutivos).
 */
function checkDuplicate(client, message) {
    if (!client.consecutiveMap.has(message.author.id)) {
        client.consecutiveMap.set(message.author.id, { content: '', count: 0 });
    }
    const data = client.consecutiveMap.get(message.author.id);

    // Si el contenido es igual al anterior
    if (data.content === message.content && message.content !== '') {
        data.count++;
        // Trigger a los 3 mensajes iguales
        return data.count >= 3;
    }

    // Reset si el mensaje es distinto
    data.content = message.content;
    data.count = 1;
    return false;
}