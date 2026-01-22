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

    console.log(`[Seguridad] Aplicando aislamiento a ${member.user.tag}. Razón: ${reason}`);

    // --- 1. Enviar DM ---
    await member.send(`⚠️ Tu cuenta fue aislada en **Capi Netta RP** por actividad sospechosa. Revisá el canal de soporte.`).catch(() => {
        console.log(`[Aviso] DMs cerrados para ${member.user.tag}`);
    });

    // --- 2. Gestión de Roles (Limpieza Total) ---
    const roleIdMuted = config.roleMuted;

    if (!roleIdMuted) {
        return console.error("❌ ERROR: El ID del rol Muted es undefined. Revisá tu .env y reiniciá PM2.");
    }

    try {
        // .set([ID]) elimina TODOS los roles y pone solo el que le pasamos
        await member.roles.set([roleIdMuted]);
        console.log(`✅ Usuario ${member.user.tag} aislado correctamente con rol Muted.`);
    } catch (err) {
        console.error(`❌ ERROR DE JERARQUÍA: El bot no puede gestionar roles de ${member.user.tag}.`);
        console.error("Asegurate de que el rol del BOT esté ARRIBA de 'Whitelist Aprobada' y 'Muteado' en los ajustes de Discord.");
        logError(client, err, "Aisol - Role Set");
    }

    // --- 3. Aviso en canal de soporte ---
    const supportChannel = await client.channels.fetch(config.supportScamChannel).catch(() => null);
    if (supportChannel) {
        await supportChannel.send(`🚨 **<@${userId}>**, tu cuenta ha sido restringida por seguridad. Mirá el mensaje fijado 📌.`);
    }

    await sendLog(client, message.author, `🛡️ **AISLAMIENTO**: ${message.author.tag} fue enviado a soporte por ${reason}.`);
}