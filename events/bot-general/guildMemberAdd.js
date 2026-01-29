/**
 * @file guildMemberAdd.js
 * @description Evento disparado cuando un usuario entra al servidor.
 * Genera una tarjeta de bienvenida (imagen) usando `canvas` y la envía al canal configurado.
 */

const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const { getGuildSettings } = require("../../utils/dataHandler");

// Registrar fuente personalizada estilo GTA (comprobar ruta assets)
registerFont(path.join(__dirname, '../../assets/fonts/pricedown.otf'), { family: 'GTA' });

module.exports = {
    name: "guildMemberAdd",
    async execute(client, member) {
        // 1. Verificar configuración del canal de bienvenida
        const settings = await getGuildSettings(member.guild.id);
        if (!settings || !settings.welcomeChannel) return;

        // 2. Preparar el Canvas (Lienzo 1024x450)
        const canvas = createCanvas(1024, 450);
        const ctx = canvas.getContext('2d');

        try {
            // Cargar fondo base
            const background = await loadImage(path.join(__dirname, '../../assets/hero-bg.png'));

            // A. EFECTO ZOOM: Recortamos un área central (80% ancho, 60% alto) y la estiramos
            // Esto elimina bordes no deseados y centra la acción
            const zoomX = background.width * 0.10;
            const zoomY = background.height * 0.20;
            const zoomWidth = background.width * 0.80;
            const zoomHeight = background.height * 0.60;
            ctx.drawImage(background, zoomX, zoomY, zoomWidth, zoomHeight, 0, 0, canvas.width, canvas.height);

            // B. FILTRO OSCURO: Capa negra semi-transparente para mejorar legibilidad del texto
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // C. AVATAR CIRCULAR CON BORDE NEÓN
            ctx.save();
            ctx.beginPath();
            ctx.arc(200, 225, 135, 0, Math.PI * 2, true); // Círculo en (200, 225) radio 135
            ctx.lineWidth = 10; // Borde grueso
            ctx.strokeStyle = '#3498db'; // Color azul Capi
            ctx.stroke();
            ctx.clip(); // Recortar todo lo que se dibuje después dentro del círculo
            const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 512 }));
            ctx.drawImage(avatar, 65, 90, 270, 270); // Dibujar avatar
            ctx.restore(); // Restaurar contexto (salir del recorte circular)

            // D. TEXTOS
            ctx.shadowColor = "black";
            ctx.shadowBlur = 15;
            ctx.textAlign = "left";

            // - Título Fijo
            ctx.fillStyle = '#ffffff';
            ctx.font = '42px "GTA"';
            ctx.fillText('¡BIENVENIDO/A A LA CIUDAD!', 380, 170);

            // - Nombre de Usuario (Auto-Ajustable)
            ctx.fillStyle = '#3498db';
            let fontSize = 100;
            const userName = member.user.username.toUpperCase();

            // Loop para reducir tamaño de fuente si el nombre es muy largo y se sale del canvas
            do {
                ctx.font = `${fontSize}px "GTA"`;
                fontSize -= 5;
            } while (ctx.measureText(userName).width > 600 && fontSize > 40);

            ctx.fillText(userName, 380, 280);

            // - Contador de Miembros
            ctx.fillStyle = '#aaaaaa';
            ctx.font = '30px "GTA"';
            ctx.fillText(`CIUDADANO NÚMERO #${member.guild.memberCount}`, 380, 360);

            // 3. ENVIAR MENSAJE
            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'bienvenida-capi.png' });
            const channel = await member.guild.channels.fetch(settings.welcomeChannel);

            if (channel) {
                await channel.send({
                    content: `🔥 <@${member.id}>, ¡ya estás en las calles de **${member.guild.name}**!`,
                    files: [attachment]
                });
            }

        } catch (err) {
            console.error("Error en bienvenida:", err);
        }

        // 4. ASIGNAR ROL DE "SIN VERIFICAR" SI EXISTE
        try {
            if (settings.roleNoVerify) {
                const unverifiedRole = member.guild.roles.cache.get(settings.roleNoVerify);
                if (unverifiedRole) {
                    await member.roles.add(unverifiedRole);
                    console.log(`✅ Rol "Sin Verificar" asignado a ${member.user.tag}`);
                } else {
                    console.warn(`⚠️ Rol Sin Verificar no encontrado en caché para ${member.guild.name}`);
                }
            }
        } catch (error) {
            console.error(`❌ Error asignando rol Sin Verificar a ${member.user.tag}:`, error);
        }
    },
};