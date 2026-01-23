const { sendLog, logError } = require("../../utils/logger");
const { getUserRoles, getGuildSettings } = require("../../utils/dataHandler");

const MIN_ACCOUNT_AGE = 7 * 24 * 60 * 60 * 1000;

module.exports = {
    name: "guildMemberAdd",
    async execute(client, member) {
        const guildId = member.guild.id;
        const accountAge = Date.now() - member.user.createdTimestamp;

        // 1. Obtener la configuración dinámica de la DB
        const settings = await getGuildSettings(guildId);
        if (!settings || !settings.isSetup) return; // Si no hay /setup, no hace nada

        // 2. Anti-Bot: Cuentas nuevas
        if (accountAge < MIN_ACCOUNT_AGE) {
            await member.send("🚫 Tu cuenta es demasiado nueva para este servidor.").catch(() => { });
            await member.kick("Cuenta muy nueva (Anti-Bot)").catch(err => logError(client, err, "AntiBot Kick", guildId));
            return;
        }

        // 3. Verificación de Cuarentena Persistente
        const savedRoles = await getUserRoles(member.id);
        if (savedRoles && savedRoles.length > 0) {
            const roleMuted = settings.roleMuted;
            if (roleMuted) {
                await member.roles.add(roleMuted).catch(err => logError(client, err, "Re-apply Mute", guildId));

                const sChannel = await client.channels.fetch(settings.supportChannel).catch(() => null);
                if (sChannel) sChannel.send(`🚨 **<@${member.id}>** reingresó intentando evadir aislamiento. Se re-aplicó el mute.`);

                sendLog(client, member.user, `🛡️ **PERSISTENCIA**: ${member.user.tag} devuelto a cuarentena por reingreso.`, guildId);
                return;
            }
        }

        // 4. Flujo Normal: Asignar Rol No Verificado
        const roleNoVerify = settings.roleNoVerify;
        if (roleNoVerify) {
            await member.roles.add(roleNoVerify).catch(err => logError(client, err, "Add Role NoVerify", guildId));
        }

        // 5. Bienvenida
        const welcomeChannel = settings.welcomeChannel;
        if (welcomeChannel) {
            const channel = await member.guild.channels.fetch(welcomeChannel).catch(() => null);
            if (channel) {
                channel.send(`Hola <@${member.id}>, bienvenido a **${member.guild.name}**`).catch(() => { });
            }
        }

        sendLog(client, member.user, `📥 **${member.user.tag}** entró al servidor`, guildId);
    },
};