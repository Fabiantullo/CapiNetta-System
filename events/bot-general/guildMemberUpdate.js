const { AuditLogEvent } = require("discord.js");
const { sendLog, logError } = require("../../utils/logger");

const delayMap = new Map();

module.exports = {
    name: "guildMemberUpdate",
    async execute(client, oldM, newM) {
        const addedRoles = newM.roles.cache.filter(r => !oldM.roles.cache.has(r.id));
        const removedRoles = oldM.roles.cache.filter(r => !newM.roles.cache.has(r.id));

        if (addedRoles.size === 0 && removedRoles.size === 0) return;

        // ID único para el usuario en este servidor
        const key = `${newM.guild.id}-${newM.id}`;

        // Limpiar timeout anterior si existe
        if (delayMap.has(key)) {
            clearTimeout(delayMap.get(key).timeout);
        }

        // Obtener o inicializar datos acumulados
        const data = delayMap.get(key) || { added: [], removed: [] };

        // Acumular roles (evitando duplicados por si acaso)
        addedRoles.forEach(r => {
            if (!data.added.some(ar => ar.id === r.id)) data.added.push(r);
        });
        removedRoles.forEach(r => {
            if (!data.removed.some(rr => rr.id === r.id)) data.removed.push(r);
        });

        // Configurar nuevo timeout
        data.timeout = setTimeout(async () => {
            delayMap.delete(key); // Limpiar memoria

            // Lógica de envío de logs
            const logs = await newM.guild.fetchAuditLogs({ limit: 5, type: AuditLogEvent.MemberRoleUpdate }).catch(err => {
                logError(client, err, "Fetch Role Audit Log");
                return null;
            });

            // Buscar log reciente
            const logEntry = logs?.entries.find(e => e.target.id === newM.id && e.createdTimestamp > (Date.now() - 5000));
            const executor = logEntry ? logEntry.executor : null;
            const executorText = executor ? `${executor.tag} (${executor.id})` : "Desconocido";

            // Enviar logs agrupados
            if (data.added.length > 0) {
                const rolesText = data.added.map(r => `**${r.name}**`).join(", ");
                sendLog(client, newM.user, `🎭 Roles agregados: ${rolesText} por ${executorText}`);
            }

            if (data.removed.length > 0) {
                const rolesText = data.removed.map(r => `**${r.name}**`).join(", ");
                sendLog(client, newM.user, `🎭 Roles removidos: ${rolesText} por ${executorText}`);
            }

        }, 2000); // Esperar 2 segundos desde el último evento

        delayMap.set(key, data);
    },
};
