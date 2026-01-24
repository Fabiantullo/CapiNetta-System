/**
 * @file guildMemberUpdate.js
 * @description Evento para registrar cambios de roles de usuarios.
 * 
 * Implementa una lógica avanzada de "Debounce" y "Consolidación de Sesión" para evitar spam en logs 
 * cuando un bot o admin añade/quita múltiples roles rápidamente.
 * 
 * Estrategia:
 * 1. Debounce (10s): Espera a que termine una ráfaga de cambios instantáneos.
 * 2. Net Change: Si se agrega y quita el mismo rol en ese lapso, se cancelan.
 * 3. Session (60s): Si ocurren más cambios poco después, edita el mensaje de log existente en vez de enviar uno nuevo.
 */

const { AuditLogEvent } = require("discord.js");
const { sendLog, logError } = require("../../utils/logger");

// buffer temporal para debounce corto
const delayMap = new Map();
// mapa persistente para consolidar logs editables (sesión larga)
const logSessionMap = new Map();

module.exports = {
    name: "guildMemberUpdate",
    async execute(client, oldM, newM) {
        // Calcular diferencias puras
        const addedRoles = newM.roles.cache.filter(r => !oldM.roles.cache.has(r.id));
        const removedRoles = oldM.roles.cache.filter(r => !newM.roles.cache.has(r.id));

        if (addedRoles.size === 0 && removedRoles.size === 0) return;

        const key = `${newM.guild.id}-${newM.id}`;

        // Reiniciar timer de Debounce si llega un nuevo evento rápido
        if (delayMap.has(key)) {
            clearTimeout(delayMap.get(key).timeout);
        }

        const data = delayMap.get(key) || { added: [], removed: [] };

        // --- FASE 1: ACUMULACIÓN Y NET CHANGE ---
        // Integramos los nuevos cambios al buffer 'data' y cancelamos redundantes.

        addedRoles.forEach(role => {
            const removedIndex = data.removed.findIndex(r => r.id === role.id);
            if (removedIndex !== -1) {
                // Si estaba marcado para borrar y ahora se agrega -> Se cancela (Net Zero)
                data.removed.splice(removedIndex, 1);
            } else {
                if (!data.added.some(r => r.id === role.id)) data.added.push(role);
            }
        });

        removedRoles.forEach(role => {
            const addedIndex = data.added.findIndex(r => r.id === role.id);
            if (addedIndex !== -1) {
                // Si estaba marcado para agregar y ahora se borra -> Se cancela
                data.added.splice(addedIndex, 1);
            } else {
                if (!data.removed.some(r => r.id === role.id)) data.removed.push(role);
            }
        });

        // Configurar Timeout de 10s para procesar el lote final
        data.timeout = setTimeout(async () => {
            delayMap.delete(key);

            if (data.added.length === 0 && data.removed.length === 0) return;

            // --- FASE 2: CONSOLIDACIÓN DE MENSAJE (SESIÓN) ---
            let session = logSessionMap.get(key);

            if (!session) {
                session = {
                    added: [],
                    removed: [],
                    message: null, // Mensaje de Discord enviado (para editarlo luego)
                    timer: null,
                    executor: null
                };
            } else {
                // Si ya hay sesión, cancelamos su expiración para extenderla
                clearTimeout(session.timer);
            }

            // Mezclar datos del buffer (lote actual) con la sesión acumulada
            data.added.forEach(role => {
                const removedIndex = session.removed.findIndex(r => r.id === role.id);
                if (removedIndex !== -1) session.removed.splice(removedIndex, 1);
                else if (!session.added.some(r => r.id === role.id)) session.added.push(role);
            });

            data.removed.forEach(role => {
                const addedIndex = session.added.findIndex(r => r.id === role.id);
                if (addedIndex !== -1) session.added.splice(addedIndex, 1);
                else if (!session.removed.some(r => r.id === role.id)) session.removed.push(role);
            });

            // --- INTENTO DE IDENTIFICAR QUIEN HIZO EL CAMBIO (AUDIT LOGS) ---
            let executorText = "Desconocido";
            if (!session.executor) {
                if (newM.guild && newM.guild.available) {
                    try {
                        const logs = await newM.guild.fetchAuditLogs({ limit: 5, type: AuditLogEvent.MemberRoleUpdate });
                        // Buscamos entrada reciente coincidente con el usuario objetivo
                        const logEntry = logs?.entries.find(e => e.target.id === newM.id && e.createdTimestamp > (Date.now() - 20000));
                        if (logEntry?.executor) {
                            session.executor = logEntry.executor;
                        }
                    } catch (err) {
                        console.error("AuditLog Error (posible falta de permisos):", err.message);
                    }
                }
            }

            if (session.executor) executorText = `${session.executor.tag} (${session.executor.id})`;

            // --- GENERAR TEXTO ---
            let finalText = "";
            if (session.added.length > 0) {
                finalText += `🎭 Roles agregados: ${session.added.map(r => `**${r.name}**`).join(", ")} por ${executorText}\n`;
            }
            if (session.removed.length > 0) {
                finalText += `🎭 Roles removidos: ${session.removed.map(r => `**${r.name}**`).join(", ")} por ${executorText}\n`;
            }

            if (!finalText.trim()) finalText = "⚠️ Roles actualizados (Net Zero)";

            // --- ENVIAR O EDITAR ---
            if (session.message) {
                // Editar para evitar spam
                await sendLog(client, newM.user, finalText, null, session.message);
                // Nota: sendLog soporta mensaje opcional para editar
            } else {
                // Enviar nuevo
                // Pasamos guildId=null porque sendLog aquí se usa modo wrapper, pero sendLog requiere guildId para log interno
                // Usamos la versión de sendLog que retorna el mensaje
                const sentMsg = await sendLog(client, newM.user, finalText, newM.guild.id);
                if (sentMsg) session.message = sentMsg;
            }

            // Expiración de sesión (60s sin actividad cierran el ciclo de edición)
            session.timer = setTimeout(() => {
                logSessionMap.delete(key);
            }, 60000);

            logSessionMap.set(key, session);

        }, 10000); // Fin Timeout 10s

        delayMap.set(key, data);
    },
};
