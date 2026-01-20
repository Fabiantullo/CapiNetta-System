const { logError } = require("../../utils/logger");

module.exports = {
    name: "messageCreate",
    async execute(client, message) {
        if (!message.guild || message.author.bot) return;

        const channelId = message.channel.id;
        const userId = message.author.id;

        // Usar el mapa global adjunto al cliente
        if (!client.consecutiveMap.has(channelId))
            client.consecutiveMap.set(channelId, { lastUser: null, count: 0 });

        const data = client.consecutiveMap.get(channelId);

        if (data.lastUser === userId) data.count++;
        else { data.lastUser = userId; data.count = 1; }

        if (data.count >= 5) {
            // Spam detectado
            const currentWarns = (client.warnMap.get(userId) || 0) + 1;
            client.warnMap.set(userId, currentWarns);

            const { saveWarns } = require("../../utils/dataHandler");
            saveWarns(client.warnMap); // Guardar cambios

            data.count = 0; // Reset contador de spam inmediato

            // Borrar el mensaje de spam si es posible
            await message.delete().catch(() => { });

            if (currentWarns < 3) {
                // Warn 1 y 2
                const msg = await message.channel.send(`⚠️ <@${userId}>, por favor evitá el spam. Advertencia **${currentWarns}/3**.`);
                setTimeout(() => msg.delete().catch(err => logError(client, err, "Delete Warn Message")), 5000); // Borrar alerta a los 5s
            } else {
                // Warn 3: Timeout
                const member = await message.guild.members.fetch(userId).catch(() => null);
                if (member?.moderatable) {
                    await member.timeout(10 * 60 * 1000, "Acumulación de advertencias por Spam (3/3)").catch(err => logError(client, err, "Spam Timeout"));
                    message.channel.send(`🔇 <@${userId}> fue silenciado por 10 minutos debido a spam reiterado.`).catch(err => logError(client, err, "Spam Timeout Message"));
                }
                client.warnMap.delete(userId); // Reset warns después del castigo
                saveWarns(client.warnMap); // Guardar cambios
            }
        }
    },
};
