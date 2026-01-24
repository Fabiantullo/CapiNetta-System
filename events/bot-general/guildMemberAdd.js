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

        // Tamaño estándar de banner en Discord
        const canvas = createCanvas(1024, 450);
        const ctx = canvas.getContext('2d');

        try {
            const background = await loadImage(path.join(__dirname, '../../assets/hero-bg.png'));

            // --- LÓGICA DE RECORTE (CROP) PARA OCUPAR EL 100% ---
            // Esto elimina los bordes blancos de tu hero-bg.png
            const imgAspect = background.width / background.height;
            const canvasAspect = canvas.width / canvas.height;

            let sX, sY, sWidth, sHeight;

            if (imgAspect > canvasAspect) {
                sHeight = background.height;
                sWidth = sHeight * canvasAspect;
                sX = (background.width - sWidth) / 2;
                sY = 0;
            } else {
                sWidth = background.width;
                sHeight = sWidth / canvasAspect;
                sX = 0;
                sY = (background.height - sHeight) / 2;
            }

            // Dibujamos solo la parte de la ciudad estirándola al 100% del lienzo
            ctx.drawImage(background, sX, sY, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
            // ---------------------------------------------------

            // Capa de oscurecimiento degradada para legibilidad
            const gradient = ctx.createLinearGradient(0, 0, 1024, 0);
            gradient.addColorStop(0, 'rgba(0,0,0,0.8)');
            gradient.addColorStop(1, 'rgba(0,0,0,0.2)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Avatar Circular con borde neón
            ctx.save();
            ctx.beginPath();
            ctx.arc(200, 225, 130, 0, Math.PI * 2, true);
            ctx.lineWidth = 8;
            ctx.strokeStyle = '#3498db';
            ctx.stroke();
            ctx.clip();
            const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 512 }));
            ctx.drawImage(avatar, 70, 95, 260, 260);
            ctx.restore();

            // Configuración de textos con sombra
            ctx.shadowColor = "black";
            ctx.shadowBlur = 10;
            ctx.textAlign = "left";

            ctx.fillStyle = '#ffffff';
            ctx.font = '40px "GTA"';
            ctx.fillText('¡BIENVENIDO/A A LA CIUDAD!', 380, 160);

            ctx.fillStyle = '#3498db';
            ctx.font = '90px "GTA"';
            ctx.fillText(member.user.username.toUpperCase(), 380, 280);

            ctx.fillStyle = '#aaaaaa';
            ctx.font = '28px "GTA"';
            ctx.fillText(`Sos nuestro ciudadano número #${member.guild.memberCount}`, 380, 360);

            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'bienvenida-capi.png' });
            const channel = await member.guild.channels.fetch(settings.welcomeChannel);

            if (channel) {
                await channel.send({
                    content: `🎉 **${member.user.username}**, ¡ya sos parte de la familia de **${member.guild.name}**!`,
                    files: [attachment]
                });
            }

        } catch (err) {
            console.error("Fallo en Canvas:", err);
        }
    },
};