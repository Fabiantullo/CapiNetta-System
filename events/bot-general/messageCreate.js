const { logError, sendLog } = require("../../utils/logger");
const { saveUserRoles, getGuildSettings } = require("../../utils/dataHandler");

module.exports = {
    name: "messageCreate",
    async execute(client, message) {
        // Ignorar si no es un servidor o si es un bot
        if (!message.guild || message.author.bot) return;

        // 1. Obtener la configuración específica de este servidor desde la DB
        const settings = await getGuildSettings(message.guild.id);

        // Si el bot no ha sido configurado con /setup en este server, ignoramos
        if (!settings || !settings.isSetup) return;

        // 2. Lógica Anti-Scam (Menciones masivas o mensajes repetidos)
        const isScam = message.mentions.users.size > 10 || checkDuplicate(client, message);

        if (isScam) {
            await message.delete().catch(() => { });
            await applyScamSanction(
                client,
                message,
                isScam === true ? "Mensajes repetitivos" : "Menciones masivas",
                settings // Pasamos la configuración dinámica
            );
        }
    },
};

/**
 * Aplica la sanción de aislamiento preventivo usando la configuración de la DB
 */
async function applyScamSanction(client, message, reason, settings) {
    const member = await message.guild.members.fetch(message.author.id).catch(() => null);
    if (!member || !member.moderatable) return;

    // --- CAPTURAR Y GUARDAR ROLES ---
    // Filtramos usando el ID de rol de silenciado guardado en la DB para este server
    const rolesToSave = member.roles.cache
        .filter(r => r.id !== message.guild.id && r.id !== settings.roleMuted)
        .map(r => r.id);

    await saveUserRoles(member.id, rolesToSave);
    console.log(`💾 Roles guardados para ${member.user.tag} en ${message.guild.name}: ${rolesToSave.length} roles.`);

    await member.send(`⚠️ Tu cuenta fue aislada preventivamente en **${message.guild.name}** por seguridad.`).catch(() => { });

    try {
        // Aplicamos el rol de silenciado específico de este servidor
        await member.roles.set([settings.roleMuted]);

        // Enviamos alerta al canal de soporte configurado para este servidor
        const sChannel = await client.channels.fetch(settings.supportChannel).catch(() => null);
        if (sChannel) {
            await sChannel.send(`🚨 **<@${member.id}>**, tu cuenta ha sido restringida por: ${reason}. Revisá el mensaje fijado.`);
        }

        // Enviamos el log de auditoría
        await sendLog(client, member.user, `🛡️ **AISLAMIENTO**: ${member.user.tag} enviado a soporte por ${reason}.`);
    } catch (err) {
        logError(client, err, "Aisolation Roles Error");
    }
}

/**
 * Verifica si un usuario está enviando el mismo mensaje repetidamente
 */
function checkDuplicate(client, message) {
    if (!client.consecutiveMap.has(message.author.id)) {
        client.consecutiveMap.set(message.author.id, { content: '', count: 0 });
    }
    const data = client.consecutiveMap.get(message.author.id);
    if (data.content === message.content && message.content !== '') {
        data.count++;
        return data.count >= 3;
    }
    data.content = message.content;
    data.count = 1;
    return false;
}