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
            const background = await loadImage(path.join(__dirname, '../../assets/hero-bg.png'));

            // 1. ZOOM PARA ELIMINAR BORDES (100% Pantalla)
            const zoomX = background.width * 0.10;
            const zoomY = background.height * 0.20;
            const zoomWidth = background.width * 0.80;
            const zoomHeight = background.height * 0.60;
            ctx.drawImage(background, zoomX, zoomY, zoomWidth, zoomHeight, 0, 0, canvas.width, canvas.height);

            // 2. Filtro de oscuridad
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 3. Avatar Circular con Neón
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

            // 4. LÓGICA DE TEXTO CON AUTO-ESCALA PARA NOMBRES LARGOS
            ctx.shadowColor = "black";
            ctx.shadowBlur = 15;
            ctx.textAlign = "left";

            // Título
            ctx.fillStyle = '#ffffff';
            ctx.font = '42px "GTA"';
            ctx.fillText('¡BIENVENIDO/A A LA CIUDAD!', 380, 170);

            // --- Nombre de Usuario Dinámico ---
            ctx.fillStyle = '#3498db';
            let fontSize = 100;
            const userName = member.user.username.toUpperCase();

            // Si el nombre es muy largo, bajamos el tamaño de fuente hasta que entre
            do {
                ctx.font = `${fontSize}px "GTA"`;
                fontSize -= 5;
            } while (ctx.measureText(userName).width > 600 && fontSize > 40);

            ctx.fillText(userName, 380, 280);

            // Contador
            ctx.fillStyle = '#aaaaaa';
            ctx.font = '30px "GTA"';
            ctx.fillText(`CIUDADANO NÚMERO #${member.guild.memberCount}`, 380, 360);

            // 5. ENVÍO CON MENCIÓN (PULL)
            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'bienvenida-capi.png' });
            const channel = await member.guild.channels.fetch(settings.welcomeChannel);

            if (channel) {
                await channel.send({
                    content: `🔥 <@${member.id}>, ¡ya estás en las calles de **${member.guild.name}**!`, // Aquí recuperamos la mención
                    files: [attachment]
                });
            }

        } catch (err) {
            console.error("Error en bienvenida:", err);
        }
    },
};