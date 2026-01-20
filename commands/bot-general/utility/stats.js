const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const os = require('os');
const { execSync } = require('child_process');

module.exports = {
    // Definición del comando con restricción para administradores
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Muestra el estado de salud del servidor de Oracle Cloud')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), //

    async execute(interaction) {
        // 1. Cálculos de Memoria RAM
        const totalMem = (os.totalmem() / (1024 ** 3)).toFixed(2); // Convertir a GB
        const freeMem = (os.freemem() / (1024 ** 3)).toFixed(2);   // Convertir a GB
        const usedMem = (totalMem - freeMem).toFixed(2);
        const memPercentage = ((usedMem / totalMem) * 100).toFixed(1);

        // 2. Cálculo de Almacenamiento en Disco (usando el comando df -h de Linux)
        let diskUsage = "No disponible";
        try {
            // Ejecutamos el comando 'df -h /' y procesamos la salida
            const rawDisk = execSync("df -h / | tail -1").toString().trim().split(/\s+/);
            const diskSize = rawDisk[1];  // Tamaño total
            const diskUsed = rawDisk[2];  // Usado
            const diskAvail = rawDisk[3]; // Disponible
            const diskPerc = rawDisk[4];  // Porcentaje de uso
            diskUsage = `📊 **Total:** ${diskSize} | **Usado:** ${diskUsed} | **Libre:** ${diskAvail} (${diskPerc})`;
        } catch (e) {
            console.error("Error al obtener datos de disco:", e);
        }

        // 3. Información adicional del sistema
        const uptimeHours = (os.uptime() / 3600).toFixed(1); // Tiempo de encendido en horas
        const cpuModel = os.cpus()[0].model;

        // 4. Creación del Embed
        const statsEmbed = new EmbedBuilder()
            .setTitle('🖥️ Estado del Servidor - Oracle Cloud')
            .setColor(0x2ecc71)
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .addFields(
                {
                    name: '🧠 Memoria RAM',
                    value: `\`${usedMem}GB / ${totalMem}GB\` (${memPercentage}%)`,
                    inline: true
                },
                {
                    name: '⏲️ Uptime',
                    value: `\`${uptimeHours} horas\``,
                    inline: true
                },
                {
                    name: '💾 Almacenamiento',
                    value: diskUsage
                },
                {
                    name: '⚙️ CPU del Sistema',
                    value: `\`${cpuModel}\``
                },
                {
                    name: '📡 Latencia del Bot',
                    value: `\`${interaction.client.ws.ping}ms\``,
                    inline: true
                }
            )
            .setFooter({ text: 'Capi Netta RP | Sistema de Monitoreo' })
            .setTimestamp();

        // Enviar la respuesta (ephemeral: true para que solo el admin vea el log si lo prefiere)
        await interaction.reply({ embeds: [statsEmbed] });
    },
};