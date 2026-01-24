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

        const canvas = createCanvas(1024, 450);
        const ctx = canvas.getContext('2d');

        try {
            // 1. Fondo con ajuste de proporción
            const background = await loadImage(path.join(__dirname, '../../assets/hero-bg.png'));
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

            // 2. Capa de oscurecimiento degradada (de izquierda a derecha)
            const gradient = ctx.createLinearGradient(0, 0, 1024, 0);
            gradient.addColorStop(0, 'rgba(0,0,0,0.8)');
            gradient.addColorStop(1, 'rgba(0,0,0,0.1)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 3. Avatar con borde de neón
            ctx.save();
            ctx.beginPath();
            ctx.arc(200, 225, 130, 0, Math.PI * 2, true);
            ctx.lineWidth = 8;
            ctx.strokeStyle = '#3498db'; // Azul Capi Netta
            ctx.stroke();
            ctx.clip();
            const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 512 }));
            ctx.drawImage(avatar, 70, 95, 260, 260);
            ctx.restore();

            // 4. Configuración de texto con Sombra
            ctx.shadowColor = "black";
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = "left";

            // Título
            ctx.font = '40px "GTA"';
            ctx.fillText('¡BIENVENIDO/A A LA CIUDAD!', 380, 180);

            // Nombre de Usuario (En azul neón)
            ctx.fillStyle = '#3498db';
            ctx.font = '90px "GTA"';
            ctx.fillText(member.user.username.toUpperCase(), 380, 270);

            // Contador de Miembros
            ctx.fillStyle = '#aaaaaa';
            ctx.font = '28px "GTA"';
            ctx.fillText(`Sos nuestro ciudadano número #${member.guild.memberCount}`, 380, 330);

            // 5. Envío
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