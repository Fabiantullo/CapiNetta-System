const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const { getGuildSettings } = require("../../utils/dataHandler");

// Asegurate de que la fuente .otf o .ttf esté ahí
registerFont(path.join(__dirname, '../../assets/fonts/pricedown.otf'), { family: 'GTA' });

module.exports = {
    name: "guildMemberAdd",
    async execute(client, member) {
        const settings = await getGuildSettings(member.guild.id);
        if (!settings || !settings.welcomeChannel) return;

        // Lienzo rectangular de 1024x450
        const canvas = createCanvas(1024, 450);
        const ctx = canvas.getContext('2d');

        try {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 1. Cargar y dibujar el fondo de la ciudad (ocupa todo el rectángulo)
            const background = await loadImage(path.join(__dirname, '../../assets/hero-bg.png'));
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

            // 2. Capa de oscurecimiento degradada (rectangular)
            const gradient = ctx.createLinearGradient(0, 0, 1024, 0);
            gradient.addColorStop(0, 'rgba(0,0,0,0.8)');
            gradient.addColorStop(1, 'rgba(0,0,0,0.1)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 3. Avatar Circular con Neón (El único elemento redondo)
            ctx.save(); // Guardamos el estado rectangular
            ctx.beginPath();
            ctx.arc(200, 225, 130, 0, Math.PI * 2, true);
            ctx.lineWidth = 8;
            ctx.strokeStyle = '#3498db'; // Azul Capi Netta
            ctx.stroke();
            ctx.clip(); // Recortamos SOLO para el avatar
            const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 512 }));
            ctx.drawImage(avatar, 70, 95, 260, 260);
            ctx.restore(); // Restauramos el estado rectangular para los textos

            // 4. Textos estilo GTA (con Sombra)
            ctx.shadowColor = "black";
            ctx.shadowBlur = 10;
            ctx.textAlign = "left";

            // Título Blanco
            ctx.fillStyle = '#ffffff';
            ctx.font = '45px "GTA"';
            ctx.fillText('¡BIENVENIDO/A A LA CIUDAD!', 380, 180);

            // Nombre de Usuario Azul
            ctx.fillStyle = '#3498db';
            ctx.font = '90px "GTA"'; // Tamaño grande
            ctx.fillText(member.user.username.toUpperCase(), 380, 280);

            // Contador Gris
            ctx.fillStyle = '#aaaaaa';
            ctx.font = '28px "GTA"';
            ctx.fillText(`Sos nuestro ciudadano número #${member.guild.memberCount}`, 380, 360);

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