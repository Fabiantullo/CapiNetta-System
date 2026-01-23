const { logError, sendLog } = require("../../utils/logger");
const { saveUserRoles, getGuildSettings } = require("../../utils/dataHandler");

module.exports = {
    name: "messageCreate",
    async execute(client, message) {
        if (!message.guild || message.author.bot) return;

        const settings = await getGuildSettings(message.guild.id);
        if (!settings || !settings.isSetup) return;

        const isScam = message.mentions.users.size > 10 || checkDuplicate(client, message);

        if (isScam) {
            try {
                const messages = await message.channel.messages.fetch({ limit: 10 });
                const spamMessages = messages.filter(m => m.author.id === message.author.id);

                await message.channel.bulkDelete(spamMessages).catch(() => {
                    message.delete().catch(() => { });
                });

                await applyScamSanction(
                    client,
                    message,
                    isScam === true ? "Mensajes repetitivos" : "Menciones masivas",
                    settings
                );
            } catch (err) {
                logError(client, err, "Error limpiando spam", message.guild.id);
            }
        }
    },
};

async function applyScamSanction(client, message, reason, settings) {
    const member = await message.guild.members.fetch(message.author.id).catch(() => null);
    if (!member || !member.moderatable) return;

    const rolesToSave = member.roles.cache
        .filter(r => r.id !== message.guild.id && r.id !== settings.roleMuted)
        .map(r => r.id);

    // Ajuste clave: Pasamos el guildId para la nueva DB
    await saveUserRoles(message.guild.id, member.id, rolesToSave);

    await member.send(`⚠️ Tu cuenta fue aislada preventivamente en **${message.guild.name}** por seguridad.`).catch(() => { });

    try {
        await member.roles.set([settings.roleMuted]);

        const sChannel = await client.channels.fetch(settings.supportChannel).catch(() => null);
        if (sChannel) {
            await sChannel.send(`🚨 **<@${member.id}>**, tu cuenta ha sido restringida por: ${reason}. Revisá el mensaje fijado.`);
        }

        // Pasamos el guildId al log
        await sendLog(client, member.user, `🛡️ **AISLAMIENTO**: ${member.user.tag} enviado a soporte por ${reason}.`, message.guild.id);
    } catch (err) {
        logError(client, err, "Aisolation Roles Error", message.guild.id);
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