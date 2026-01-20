const config = require("../../config").general;
const { sendLog, logError } = require("../../utils/logger");

const MIN_ACCOUNT_AGE = 7 * 24 * 60 * 60 * 1000; // 7 días

module.exports = {
    name: "guildMemberAdd",
    async execute(client, member) {
        const accountAge = Date.now() - member.user.createdTimestamp;

        if (accountAge < MIN_ACCOUNT_AGE) {
            await member.send("🚫 Tu cuenta es demasiado nueva para este servidor.").catch(err => logError(client, err, "AntiBot DM"));
            await member.kick("Cuenta muy nueva (Anti-Bot)").catch(err => logError(client, err, "AntiBot Kick"));
            return;
        }

        const roleNoVerify = member.guild.roles.cache.get(config.roleNoVerify);
        if (roleNoVerify) await member.roles.add(roleNoVerify).catch(err => logError(client, err, "Add Role NoVerify"));

        const welcomeChannel = member.guild.channels.cache.get(config.welcomeChannel);
        if (welcomeChannel) {
            welcomeChannel.send(`Hola <@${member.id}>, bienvenido a **Capi Netta RP**`).catch(err => logError(client, err, "Welcome Message"));
        }

        sendLog(client, member.user, `📥 **${member.user.tag}** entró al servidor`);
    },
};
