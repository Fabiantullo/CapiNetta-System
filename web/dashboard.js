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
const PORT = process.env.PORT || 3000;

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static('web/public'));

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
                discordStats.online = guild.memberCount; // Aproximado, idealmente filtrar por presencia si fetchMembers se hizo
                discordStats.voice = guild.members.cache.filter(m => m.voice.channel).size;
                discordStats.ping = client.ws.ping;

                // Staff Online logic (Simplificada para dashboard)
                discordStats.staff = guild.members.cache.filter(m =>
                    !m.user.bot && (m.presence && m.presence.status !== 'offline') &&
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
    const tickets = await prisma.ticket.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50
    });
    res.render('tickets', { tickets, user: req.user });
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