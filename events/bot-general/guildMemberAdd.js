const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const { getGuildSettings } = require("../../utils/dataHandler");

module.exports = {
    name: "guildMemberAdd",
    async execute(client, member) {
        const guildId = member.guild.id;
        const settings = await getGuildSettings(guildId);
        if (!settings || !settings.welcomeChannel) return;

        // 1. Crear el lienzo (proporción 16:9 ideal para Discord)
        const canvas = createCanvas(1024, 500);
        const ctx = canvas.getContext('2d');

        try {
            // 2. Cargar y dibujar el fondo (tu imagen hero-bg.png)
            const background = await loadImage(path.join(__dirname, '../../assets/hero-bg.png'));
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

            // 3. Añadir un filtro oscuro para que resalte el texto
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 4. Dibujar el Avatar circular
            ctx.save();
            ctx.beginPath();
            ctx.arc(200, 250, 120, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();

            const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
            ctx.drawImage(avatar, 80, 130, 240, 240);
            ctx.restore();

            // 5. Escribir el Texto
            ctx.fillStyle = '#ffffff';
            ctx.font = '60px sans-serif'; // Podés registrar una fuente tipo GTA si querés
            ctx.fillText('¡BIENVENIDO/A!', 380, 220);

            ctx.fillStyle = '#3498db'; // El celeste de Capi Netta
            ctx.font = '80px sans-serif';
            ctx.fillText(member.user.username.toUpperCase(), 380, 310);

            ctx.fillStyle = '#cccccc';
            ctx.font = '30px sans-serif';
            ctx.fillText(`Miembro #${member.guild.memberCount}`, 380, 370);

            // 6. Enviar la imagen
            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome.png' });
            const channel = await member.guild.channels.fetch(settings.welcomeChannel);

            if (channel) {
                await channel.send({
                    content: `Hola <@${member.id}>, ¡bienvenido a la familia de **${member.guild.name}**! 🚀`,
                    files: [attachment]
                });
            }

        } catch (err) {
            console.error("Error generando imagen de bienvenida:", err);
        }
    },
};