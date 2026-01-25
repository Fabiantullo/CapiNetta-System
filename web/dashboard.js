/**
 * @file dashboard.js
 * @description Servidor Web Express para Capi Netta (Auth Protegido)
 */
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { Strategy } = require('passport-discord');
const { PermissionsBitField } = require('discord.js');

const { prisma } = require('../utils/database');
const config = require('../config');

const app = express();
const PORT = 3000;

// =============================================================================
//                             CONFIGURACIÓN PASSPORT
// =============================================================================

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new Strategy({
    clientID: config.dashboard.clientId,
    clientSecret: config.dashboard.clientSecret,
    callbackURL: config.dashboard.callbackUrl,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    // Validamos permisos AQUÍ (al loguear) para no dejar pasar a cualquiera
    // Buscamos si el usuario está en la guild configurada y es Admin

    // NOTA: Para verificar permisos reales en la guild, idealmente deberíamos
    // usar el cliente del bot, pero la API de OAuth nos da lista de guilds.
    // OAuth Guild Object tiene: { id, name, icon, permissions (bitfield), ... }

    const targetGuild = profile.guilds.find(g => g.id === config.general.guildId);

    if (!targetGuild) {
        return done(null, false, { message: "No estás en el servidor de Capi Netta." });
    }

    // Chequeamos permiso de ADMINISTRATOR (0x00000008)
    // El campo permissions viene como String numérico.
    const permissions = new PermissionsBitField(targetGuild.permissions);

    if (!permissions.has(PermissionsBitField.Flags.Administrator)) {
        return done(null, false, { message: "No tienes permisos de Administrador." });
    }

    process.nextTick(() => done(null, profile));
}));

// =============================================================================
//                             MIDDLEWARES
// =============================================================================

app.set('view engine', 'ejs');
app.set('views', './views');

app.use(session({
    secret: config.dashboard.sessionSecret,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Middleware de Protección
function checkAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/auth/discord');
}

// =============================================================================
//                             RUTAS AUTH
// =============================================================================

app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback', passport.authenticate('discord', {
    failureRedirect: '/access-denied' // Podríamos crear esta vista
}), (req, res) => {
    res.redirect('/');
});

app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
});

app.get('/access-denied', (req, res) => {
    res.status(403).send("<h1>Acceso Denegado</h1><p>No tienes permisos de Administrador en el servidor.</p><a href='/logout'>Volver</a>");
});

// =============================================================================
//                             RUTAS DASHBOARD
// =============================================================================

// Ruta Principal: Home con Estadísticas (PROTEGIDA)
app.get('/', checkAuth, async (req, res) => {
    try {
        const [users, tickets, warns] = await Promise.all([
            prisma.warn.count(),
            prisma.ticket.count({ where: { status: 'open' } }),
            prisma.activityLog.count()
        ]);

        res.render('index', {
            user: req.user, // Pasamos datos del usuario logueado
            stats: { users, tickets, warns }
        });
    } catch (error) {
        res.send("Error cargando dashboard: " + error.message);
    }
});

// Ruta para ver Tickets (PROTEGIDA)
app.get('/tickets', checkAuth, async (req, res) => {
    const tickets = await prisma.ticket.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50
    });
    res.render('tickets', { tickets, user: req.user });
});

// Función para iniciar el servidor
function startDashboard() {
    app.listen(PORT, () => {
        console.log(`🌐 Dashboard online en http://localhost:${PORT}`);
    });
}

module.exports = startDashboard;