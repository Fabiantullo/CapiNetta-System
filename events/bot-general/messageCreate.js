const { logError, sendLog } = require("../../utils/logger");
const config = require("../../config").general;

module.exports = {
    name: "messageCreate",
    async execute(client, message) {
        if (!message.guild || message.author.bot) return;

        const userId = message.author.id;

        // 1. Anti-Scam: Menciones Masivas
        if (message.mentions.users.size > 10) {
            await message.delete().catch(() => { });
            return applyScamSanction(client, message, "Menciones masivas");
        }

        // 2. Anti-Spam: Mensajes Idénticos
        if (!client.consecutiveMap.has(userId)) {
            client.consecutiveMap.set(userId, { lastContent: '', count: 0 });
        }
        const data = client.consecutiveMap.get(userId);

        if (data.lastContent === message.content && message.content !== '') {
            data.count++;
            await message.delete().catch(() => { });
        } else {
            data.lastContent = message.content;
            data.count = 1;
        }

        if (data.count >= 3) {
            data.count = 0;
            return applyScamSanction(client, message, "Mensajes repetitivos");
        }
    },
};

async function applyScamSanction(client, message, reason) {
    const userId = message.author.id;
    const member = await message.guild.members.fetch(userId).catch(() => null);

    if (!member) return;

    console.log(`[Seguridad] Aplicando sanción a ${member.user.tag}. Razón: ${reason}`);

    // --- 1. Enviar DM ---
    await member.send(`⚠️ Tu cuenta fue aislada en **Capi Netta RP** por actividad sospechosa (${reason}). Revisá el canal de soporte.`).catch(() => {
        console.log(`[Aviso] No pude enviar DM a ${member.user.tag} (DMs cerrados).`);
    });

    // --- 2. Gestión de Roles ---
    // Usamos directamente los IDs del config
    const roleIdUser = config.roleUser;
    const roleIdMuted = config.roleMuted;

    try {
        if (roleIdUser && member.roles.cache.has(roleIdUser)) {
            await member.roles.remove(roleIdUser);
            console.log(`✅ Rol de usuario removido a ${member.user.tag}`);
        }

        if (roleIdMuted) {
            await member.roles.add(roleIdMuted);
            console.log(`✅ Rol de Muteado agregado a ${member.user.tag}`);
        }
    } catch (err) {
        console.error(`❌ ERROR DE JERARQUÍA: El bot no puede gestionar roles para ${member.user.tag}. Verificá que el rol del bot esté arriba de todo.`);
        logError(client, err, "Aisol - Role Management");
    }

    // --- 3. Aviso en canal de soporte ---
    const supportChannel = await client.channels.fetch(config.supportScamChannel).catch(() => null);
    if (supportChannel) {
        await supportChannel.send(`🚨 **<@${userId}>**, tu cuenta ha sido restringida. Revisá el mensaje fijado 📌 para saber cómo recuperar tu acceso.`);
    }

    await sendLog(client, message.author, `🛡️ **AISLAMIENTO**: ${message.author.tag} fue enviado a soporte por ${reason}.`);
}