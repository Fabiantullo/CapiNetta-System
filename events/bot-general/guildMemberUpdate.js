const { AuditLogEvent } = require("discord.js");
const { sendLog, logError } = require("../../utils/logger");

const delayMap = new Map();
const logSessionMap = new Map(); // Mapa para sesiones de logs (consolidación)

module.exports = {
    name: "guildMemberUpdate",
    async execute(client, oldM, newM) {
        const addedRoles = newM.roles.cache.filter(r => !oldM.roles.cache.has(r.id));
        const removedRoles = oldM.roles.cache.filter(r => !newM.roles.cache.has(r.id));

        if (addedRoles.size === 0 && removedRoles.size === 0) return;

        // ID único para el usuario en este servidor
        const key = `${newM.guild.id}-${newM.id}`;

        // Limpiar timeout del debounce si existe
        if (delayMap.has(key)) {
            clearTimeout(delayMap.get(key).timeout);
        }

        // Obtener o inicializar datos acumulados (Buffer de Debounce)
        const data = delayMap.get(key) || { added: [], removed: [] };

        // --- 1. Acumulación Debounce con Net Change (corto plazo: 10s) ---
        // (Igual que antes: si se agrega y quita en <10s, se anula)

        addedRoles.forEach(role => {
            const removedIndex = data.removed.findIndex(r => r.id === role.id);
            if (removedIndex !== -1) {
                data.removed.splice(removedIndex, 1);
            } else {
                if (!data.added.some(r => r.id === role.id)) data.added.push(role);
            }
        });

        removedRoles.forEach(role => {
            const addedIndex = data.added.findIndex(r => r.id === role.id);
            if (addedIndex !== -1) {
                data.added.splice(addedIndex, 1);
            } else {
                if (!data.removed.some(r => r.id === role.id)) data.removed.push(role);
            }
        });

        // Configurar nuevo timeout (Debounce de 10 segundos)
        data.timeout = setTimeout(async () => {
            delayMap.delete(key); // Limpiar buffer de debounce

            // Si después del debounce no queda nada nuevo, salir
            if (data.added.length === 0 && data.removed.length === 0) return;

            // --- 2. Consolidación de Sesión (largo plazo: 60s) ---
            // Verificamos si ya hay un mensaje activo para editar
            let session = logSessionMap.get(key);

            // Si no existe sesión o expiró (más de 60s sin updates), crear nueva
            if (!session) {
                session = {
                    added: [],
                    removed: [],
                    message: null,
                    timer: null,
                    executor: null // Guardamos el executor inicial
                };
            } else {
                // Si existe, limpiar su timer de expiración para extenderlo
                clearTimeout(session.timer);
            }

            // Integrar los cambios del buffer (data) a la sesión (session) con Net Change
            data.added.forEach(role => {
                const removedIndex = session.removed.findIndex(r => r.id === role.id);
                if (removedIndex !== -1) {
                    session.removed.splice(removedIndex, 1); // Anular remoción previa
                } else if (!session.added.some(r => r.id === role.id)) {
                    session.added.push(role);
                }
            });

            data.removed.forEach(role => {
                const addedIndex = session.added.findIndex(r => r.id === role.id);
                if (addedIndex !== -1) {
                    session.added.splice(addedIndex, 1); // Anular agregado previo
                } else if (!session.removed.some(r => r.id === role.id)) {
                    session.removed.push(role);
                }
            });

            // Si al consolidar la sesión queda vacía (ej: se agregó y quitó todo), y ya había mensaje, podríamos borrarlo o dejarlo como estaba.
            // Para simplificar, si hay mensaje lo editamos.

            // Buscar ejecutor solo si no tenemos uno o para actualizarlo (opcional, costoso)
            // Usaremos el executor de este lote si no tenemos uno guardado
            let executorText = "Desconocido";
            if (!session.executor) {
                const logs = await newM.guild.fetchAuditLogs({ limit: 5, type: AuditLogEvent.MemberRoleUpdate }).catch(err => {
                    logError(client, err, "Fetch Role Audit Log");
                    return null;
                });
                const logEntry = logs?.entries.find(e => e.target.id === newM.id && e.createdTimestamp > (Date.now() - 20000));
                if (logEntry?.executor) {
                    session.executor = logEntry.executor;
                }
            }

            if (session.executor) {
                executorText = `${session.executor.tag} (${session.executor.id})`;
            }

            // Construir el texto final
            let finalText = "";
            if (session.added.length > 0) {
                const rolesText = session.added.map(r => `**${r.name}**`).join(", ");
                finalText += `🎭 Roles agregados: ${rolesText} por ${executorText}\n`;
            }
            if (session.removed.length > 0) {
                const rolesText = session.removed.map(r => `**${r.name}**`).join(", ");
                finalText += `🎭 Roles removidos: ${rolesText} por ${executorText}\n`;
            }

            if (!finalText.trim()) finalText = "⚠️ Roles actualizados (Sin cambios netos visibles)";

            // Enviar o Editar
            if (session.message) {
                // Editar mensaje existente
                await sendLog(client, newM.user, finalText, session.message);
            } else {
                // Enviar nuevo mensaje
                const sentMsg = await sendLog(client, newM.user, finalText);
                if (sentMsg) session.message = sentMsg;
            }

            // Configurar expiración de la sesión (ej: 60 segundos después del último edit)
            session.timer = setTimeout(() => {
                logSessionMap.delete(key);
            }, 60000);

            // Guardar sesión actualizada
            logSessionMap.set(key, session);

        }, 10000); // 10 segundos de debounce inicial

        delayMap.set(key, data);
    },
};
