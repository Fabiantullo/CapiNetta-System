const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const { getGuildSettings } = require("../../utils/dataHandler");

registerFont(path.join(__dirname, '../../assets/fonts/pricedown.otf'), { family: 'GTA' });

module.exports = {
    name: "guildMemberAdd",
    async execute(client, member) {
        const settings = await getGuildSettings(member.guild.id);
        if (!settings || !settings.welcomeChannel) return;

        // Tamaño exacto del banner de Discord
        const canvas = createCanvas(1024, 450);
        const ctx = canvas.getContext('2d');

        try {
            const background = await loadImage(path.join(__dirname, '../../assets/hero-bg.png'));

            // --- EL "SÚPER ZOOM" PARA SACAR LO GRIS Y BLANCO ---
            // Definimos qué parte de la foto original vamos a usar (sacando los bordes blancos)
            // Ajustamos estos valores para "entrar" directo a la ciudad
            const zoomX = background.width * 0.10; // Recortamos 10% de cada lado
            const zoomY = background.height * 0.20; // Recortamos 20% arriba y abajo (lo más blanco)
            const zoomWidth = background.width * 0.80;
            const zoomHeight = background.height * 0.60;

            // Dibujamos la ciudad estirándola para que no quede ni un píxel gris
            ctx.drawImage(background, zoomX, zoomY, zoomWidth, zoomHeight, 0, 0, canvas.width, canvas.height);
            // ---------------------------------------------------

            // Filtro de oscuridad para que el texto sea legible (100% del banner)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Avatar con borde neón
            ctx.save();
            ctx.beginPath();
            ctx.arc(200, 225, 135, 0, Math.PI * 2, true);
            ctx.lineWidth = 10;
            ctx.strokeStyle = '#3498db';
            ctx.stroke();
            ctx.clip();
            const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 512 }));
            ctx.drawImage(avatar, 65, 90, 270, 270);
            ctx.restore();

            // Textos con sombra pesada para que "salten" de la pantalla
            ctx.shadowColor = "black";
            ctx.shadowBlur = 15;
            ctx.textAlign = "left";

            ctx.fillStyle = '#ffffff';
            ctx.font = '42px "GTA"';
            ctx.fillText('¡BIENVENIDO/A A LA CIUDAD!', 380, 170);

            ctx.fillStyle = '#3498db';
            ctx.font = '100px "GTA"'; // Nombre bien potente
            ctx.fillText(member.user.username.toUpperCase(), 380, 280);

            ctx.fillStyle = '#aaaaaa';
            ctx.font = '30px "GTA"';
            ctx.fillText(`CIUDADANO NÚMERO #${member.guild.memberCount}`, 380, 360);

            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'bienvenida-capi.png' });
            const channel = await member.guild.channels.fetch(settings.welcomeChannel);

            if (channel) {
                await channel.send({
                    content: `🔥 **${member.user.username}**, ¡ya estás en las calles de **${member.guild.name}**!`,
                    files: [attachment]
                });
            }

        } catch (err) {
            console.error("Fallo técnico en la imagen:", err);
        }
    },
};