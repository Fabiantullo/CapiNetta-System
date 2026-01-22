const { logError, sendLog } = require("../../utils/logger");
const config = require("../../config").general;

module.exports = {
    name: "messageCreate",
    async execute(client, message) {
        if (!message.guild || message.author.bot) return;

        const userId = message.author.id;
        const isScam = message.mentions.users.size > 10 || checkDuplicate(client, message);

        if (isScam) {
            await message.delete().catch(() => { });
            await applyScamSanction(client, message, isScam === true ? "Mensajes repetitivos" : "Menciones masivas");
        }
    },
};

async function applyScamSanction(client, message, reason) {
    const member = await message.guild.members.fetch(message.author.id).catch(() => null);
    if (!member || !member.moderatable) return;

    // DM al usuario
    await member.send(`⚠️ Tu cuenta fue aislada en **Capi Netta RP** por seguridad (${reason}). Revisá el canal de soporte.`).catch(() => { });

    try {
        // Aislamiento Total: Quita todo y pone solo Muted
        await member.roles.set([config.roleMuted]);

        const sChannel = await client.channels.fetch(config.supportScamChannel).catch(() => null);
        if (sChannel) await sChannel.send(`🚨 **<@${member.id}>**, tu cuenta ha sido restringida. Revisá el mensaje fijado 📌.`);

        await sendLog(client, member.user, `🛡️ **AISLAMIENTO**: ${member.user.tag} enviado a soporte por ${reason}.`);
    } catch (err) {
        logError(client, err, "Aisolation Roles Error");
    }
}

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