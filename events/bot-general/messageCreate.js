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
            return applyScamSanction(client, message, "Menciones masivas (Posible Scam)");
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
            return applyScamSanction(client, message, "Spam de mensajes idénticos (Posible Scam)");
        }
    },
};

async function applyScamSanction(client, message, reason) {
    const userId = message.author.id;
    const member = await message.guild.members.fetch(userId).catch(() => null);

    if (member && member.moderatable) {
        // --- 1. Enviar mensaje por PRIVADO (DM) ---
        await member.send({
            content: `⚠️ **Aviso de Seguridad - Capi Netta RP**\n\nTu cuenta ha sido aislada preventivamente del servidor debido a: **${reason}**.\n\nEsto sucede usualmente cuando una cuenta es hackeada para enviar enlaces maliciosos. No te preocupes, hemos creado un canal de soporte para vos dentro del servidor para ayudarte a recuperar el acceso.`
        }).catch(() => {
            console.log(`No se pudo enviar DM a ${message.author.tag} (DMs cerrados).`);
        });

        // --- 2. Gestión de Roles ---
        const roleUser = message.guild.roles.cache.get(config.roleUser);
        const roleMuted = message.guild.roles.cache.get(config.roleMuted);

        if (roleUser) await member.roles.remove(roleUser).catch(e => logError(client, e, "Scam - Remove Role"));
        if (roleMuted) await member.roles.add(roleMuted).catch(e => logError(client, e, "Scam - Add Muted"));

        // --- 3. Aviso en el canal de soporte ---
        const supportChannel = await client.channels.fetch(config.supportScamChannel).catch(() => null);
        if (supportChannel) {
            await supportChannel.send(
                `🚨 **<@${userId}>**, se ha detectado actividad sospechosa en tu cuenta.\n` +
                `Por favor, lee el mensaje fijado 📌 arriba para saber cómo recuperar tus permisos.`
            );
        }

        await sendLog(client, message.author, `🛡️ **AISLAMIENTO**: ${message.author.tag} enviado a la **𝐙𝐎𝐍𝐀 𝐌𝐔𝐓𝐄** por posible scam.`);
    }
}