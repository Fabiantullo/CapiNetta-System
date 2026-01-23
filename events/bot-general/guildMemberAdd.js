const config = require("../../config").general;
const { sendLog, logError } = require("../../utils/logger");
const { getUserRoles } = require("../../utils/dataHandler");

const MIN_ACCOUNT_AGE = 7 * 24 * 60 * 60 * 1000;

module.exports = {
    name: "guildMemberAdd",
    async execute(client, member) {
        const accountAge = Date.now() - member.user.createdTimestamp;

        // 1. Anti-Bot: Cuentas nuevas
        if (accountAge < MIN_ACCOUNT_AGE) {
            await member.send("🚫 Tu cuenta es demasiado nueva para este servidor.").catch(() => { });
            await member.kick("Cuenta muy nueva (Anti-Bot)").catch(err => logError(client, err, "AntiBot Kick"));
            return;
        }

        // 2. Verificación de Cuarentena Persistente
        const savedRoles = await getUserRoles(member.id);
        if (savedRoles && savedRoles.length > 0) {
            const roleMuted = member.guild.roles.cache.get(config.roleMuted);
            if (roleMuted) {
                await member.roles.add(roleMuted).catch(err => logError(client, err, "Re-apply Mute"));

                const sChannel = await client.channels.fetch(config.supportScamChannel).catch(() => null);
                if (sChannel) sChannel.send(`🚨 **<@${member.id}>** reingresó intentando evadir aislamiento. Se re-aplicó el mute.`);

                sendLog(client, member.user, `🛡️ **PERSISTENCIA**: ${member.user.tag} devuelto a cuarentena por reingreso.`);
                return; // Corta aquí para que no reciba bienvenida ni rol de usuario
            }
        }

        // 3. Flujo Normal
        const roleNoVerify = member.guild.roles.cache.get(config.roleNoVerify);
        if (roleNoVerify) await member.roles.add(roleNoVerify).catch(err => logError(client, err, "Add Role NoVerify"));

        const welcomeChannel = member.guild.channels.cache.get(config.welcomeChannel);
        if (welcomeChannel) {
            welcomeChannel.send(`Hola <@${member.id}>, bienvenido a **Capi Netta RP**`).catch(() => { });
        }

        sendLog(client, member.user, `📥 **${member.user.tag}** entró al servidor`);
    },
};