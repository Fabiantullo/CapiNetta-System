/**
 * @file dashboard.js
 * @description Servidor Web Express para Capi Netta (Auth Protegido)
 */
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { Strategy } = require('passport-discord-auth');
const { PermissionsBitField } = require('discord.js');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { prisma } = require('../utils/database');
const config = require('../config');

const app = express();
const PORT = process.env.PORT || 3000;

// Confianza en proxy para que secure cookies funcionen detrás de Nginx/Cloudflare
app.set('trust proxy', 1);

// Seguridad HTTP básica
app.use(helmet({
    contentSecurityPolicy: false // desactivamos CSP por EJS sin nonce; se puede afinar luego
}));

// Rate limiting suave para endpoints públicos
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false
}));

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static('web/public'));

// =============================================================================
//                             CONFIGURACIÓN PASSPORT
// =============================================================================

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new Strategy({
    // La librería espera los campos en minúsculas exactas
    clientId: config.dashboard.clientId,
    clientSecret: config.dashboard.clientSecret,
    callbackUrl: config.dashboard.callbackUrl,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    // Solo validar que el usuario está en la guild
    // Los permisos reales se validan en checkAuth middleware contra el servidor en vivo
    const targetGuild = profile.guilds.find(g => g.id === config.general.guildId);

    if (!targetGuild) {
        return done(null, false, { message: "No estás en el servidor de Capi Netta." });
    }

    process.nextTick(() => done(null, profile));
}));

// =============================================================================
//                             MIDDLEWARES
// =============================================================================

app.set('view engine', 'ejs');
app.set('views', './web/views');

app.use(session({
    name: 'capi-dashboard.sid',
    secret: config.dashboard.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 12 // 12h de sesión
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// Middleware de Protección: requiere sesión válida y refresca permisos con el bot
async function checkAuth(req, res, next) {
    if (!req.isAuthenticated()) return res.redirect('/auth/discord');

    const discordClient = app.locals.discordClient;
    if (!discordClient) {
        return res.status(503).send('Dashboard sin conexión al bot.');
    }

    try {
        const guild = await discordClient.guilds.fetch(config.general.guildId);
        const member = await guild.members.fetch(req.user.id);

        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return res.redirect('/access-denied');
        }

        // Adjuntar miembro para uso en vistas si hace falta
        req.discordMember = member;
        return next();
    } catch (err) {
        return res.status(403).send('No se pudo validar permisos en el servidor.');
    }
}

// =============================================================================
//                             RUTAS AUTH
// =============================================================================

// Ruta de login: genera state aleatorio para evitar CSRF y replays
app.get('/auth/discord', (req, res, next) => {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.oauthState = state;
    passport.authenticate('discord', { state })(req, res, next);
});

// Callback: valida state antes de completar el login
app.get('/auth/discord/callback', (req, res, next) => {
    if (!req.session.oauthState || req.query.state !== req.session.oauthState) {
        return res.status(403).send('Invalid OAuth state.');
    }
    delete req.session.oauthState;
    next();
}, passport.authenticate('discord', {
    failureRedirect: '/access-denied'
}), (req, res) => {
    res.redirect('/');
});

app.get('/logout', (req, res) => {
    req.logout(() => {
        req.session.destroy(() => res.redirect('/'));
    });
});

app.get('/access-denied', (req, res) => {
    res.status(403).send("<h1>Acceso Denegado</h1><p>No tienes permisos de Administrador en el servidor.</p><a href='/logout'>Volver</a>");
});

// =============================================================================
//                             RUTAS DASHBOARD
// =============================================================================

// Ruta Principal: Página de Bienvenida (SIN PROTECCIÓN)
app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/dashboard');
    }
    res.render('login', { user: req.user });
});

// Ruta Dashboard: Home con Estadísticas (PROTEGIDA)
app.get('/dashboard', checkAuth, async (req, res) => {
    try {
        const [usersWarned, ticketsOpen, warnsAggregate, activityLogs] = await Promise.all([
            prisma.warn.count(), // Cantidad de usuarios con warns
            prisma.ticket.count({ where: { status: 'open' } }),
            prisma.warn.aggregate({ _sum: { count: true } }), // Suma total de warns
            prisma.activityLog.findMany({ orderBy: { timestamp: 'desc' }, take: 10 }) // Últimos 10 logs
        ]);

        const warnsTotal = warnsAggregate._sum.count || 0;

        // Datos de Discord (Si el cliente está disponible)
        let discordStats = {
            online: 0,
            voice: 0,
            staff: 0,
            ping: 0
        };

        if (app.locals.discordClient) {
            const client = app.locals.discordClient;
            const guild = client.guilds.cache.get(config.general.guildId);

            if (guild) {
                const presences = guild.presences?.cache || guild.members.cache;
                discordStats.online = guild.memberCount;
                discordStats.voice = guild.members.cache.filter(m => m.voice.channel).size;
                discordStats.ping = client.ws.ping;

                // Staff Online logic (con presencia cuando está disponible)
                discordStats.staff = guild.members.cache.filter(m =>
                    !m.user.bot &&
                    (presences.get(m.id)?.status || m.presence?.status) !== 'offline' &&
                    (m.permissions.has(PermissionsBitField.Flags.ModerateMembers) || m.permissions.has(PermissionsBitField.Flags.Administrator))
                ).size;
            }
        }

        res.render('index', {
            user: req.user,
            stats: {
                usersWarned,
                ticketsOpen,
                warnsTotal,
                ...discordStats
            },
            logs: activityLogs
        });
    } catch (error) {
        res.send("Error cargando dashboard: " + error.message);
    }
});

// Ruta para ver Tickets (PROTEGIDA)
app.get('/tickets', checkAuth, async (req, res) => {
    const { status, type, claimed } = req.query;

    const where = {};
    if (status && ['open', 'claimed', 'closed', 'archived'].includes(status)) where.status = status;
    if (type) where.type = type;
    if (claimed === 'true') where.claimedBy = { not: null };
    if (claimed === 'false') where.claimedBy = null;

    const tickets = await prisma.ticket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100
    });

    // Distinct types for filter UI
    const types = await prisma.ticket.groupBy({
        by: ['type'],
        _count: { type: true }
    });

    res.render('tickets', { tickets, user: req.user, filters: { status, type, claimed }, types });
});

// Ruta para ver Logs Completos (PROTEGIDA)
app.get('/logs', checkAuth, async (req, res) => {
    const logs = await prisma.activityLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 100
    });
    res.render('logs', { logs, user: req.user });
});

// Función para iniciar el servidor
function startDashboard(discordClient) {
    // Guardamos el cliente en locals para acceder en rutas
    app.locals.discordClient = discordClient;

    app.listen(PORT, () => {
        console.log(`🌐 Dashboard online en http://localhost:${PORT}`);
    });
}

module.exports = startDashboard;