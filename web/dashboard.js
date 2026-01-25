/**
 * @file dashboard.js
 * @description Servidor Web Express para Capi Netta
 */
const express = require('express');
const { prisma } = require('../utils/database'); // Usamos tu conexión existente
const app = express();
const PORT = 3000;

// Configurar EJS para renderizar HTML
app.set('view engine', 'ejs');
app.set('views', './views'); // Carpeta donde guardaremos los HTML

// Ruta Principal: Home con Estadísticas
app.get('/', async (req, res) => {
    try {
        // Consultamos datos reales usando Prisma
        const [users, tickets, warns] = await Promise.all([
            prisma.warn.count(), // Ejemplo: total de gente con warns
            prisma.ticket.count({ where: { status: 'open' } }),
            prisma.activityLog.count()
        ]);

        // Renderizamos la vista 'index' pasándole los datos
        res.render('index', {
            stats: { users, tickets, warns }
        });
    } catch (error) {
        res.send("Error cargando dashboard: " + error.message);
    }
});

// Ruta para ver Tickets
app.get('/tickets', async (req, res) => {
    const tickets = await prisma.ticket.findMany({
        where: { status: 'open' },
        orderBy: { createdAt: 'desc' }
    });
    res.render('tickets', { tickets });
});

// Función para iniciar el servidor
function startDashboard() {
    app.listen(PORT, () => {
        console.log(`🌐 Dashboard online en http://localhost:${PORT}`);
    });
}

module.exports = startDashboard;