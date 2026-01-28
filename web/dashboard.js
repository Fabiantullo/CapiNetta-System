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

// Seguridad HTTP básica con CSP permisivo para CDNs
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "https://cdn.discordapp.com", "data:"],
            connectSrc: ["'self'"]
        }
    }
}));

// Headers adicionales para evitar caché de archivos estáticos
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
});

// Rate limiting suave para endpoints públicos
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false
}));

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static('web/public', {
    maxAge: 0,
    etag: false
}));

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
        // Obtener todos los servidores donde el usuario es admin
        const userGuilds = req.user.guilds || [];
        const adminGuilds = [];

        for (const guild of userGuilds) {
            // Verificar que el bot esté en ese servidor
            const botGuild = discordClient.guilds.cache.get(guild.id);
            if (!botGuild) continue;

            try {
                const member = await botGuild.members.fetch(req.user.id);
                if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    adminGuilds.push({
                        id: guild.id,
                        name: guild.name,
                        icon: guild.icon
                    });
                }
            } catch (err) {
                continue;
            }
        }

        if (adminGuilds.length === 0) {
            return res.redirect('/access-denied');
        }

        // Guardar lista de servidores con acceso
        req.adminGuilds = adminGuilds;

        // Obtener servidor seleccionado de la sesión o query
        let selectedGuildId = req.query.server || req.session.selectedGuildId;

        // Si no hay servidor seleccionado o no tiene acceso, usar el primero
        if (!selectedGuildId || !adminGuilds.find(g => g.id === selectedGuildId)) {
            selectedGuildId = adminGuilds[0].id;
        }

        // Guardar en sesión
        req.session.selectedGuildId = selectedGuildId;

        // Verificar permisos en el servidor seleccionado
        const guild = await discordClient.guilds.fetch(selectedGuildId);
        const member = await guild.members.fetch(req.user.id);

        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return res.redirect('/access-denied');
        }

        // Adjuntar información para las vistas
        req.discordMember = member;
        req.selectedGuild = {
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            memberCount: guild.memberCount
        };

        return next();
    } catch (err) {
        console.error('Error en checkAuth:', err);
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
        const guildId = req.selectedGuild.id;

        const [usersWarned, ticketsOpen, warnsAggregate, activityLogs] = await Promise.all([
            prisma.warn.count({ where: { guildId } }),
            prisma.ticket.count({ where: { guildId, status: 'open' } }),
            prisma.warn.aggregate({ where: { guildId }, _sum: { count: true } }),
            prisma.activityLog.findMany({ 
                where: { guildId },
                orderBy: { timestamp: 'desc' }, 
                take: 10 
            })
        ]);

        const warnsTotal = warnsAggregate._sum.count || 0;

        // Datos de Discord
        let discordStats = {
            online: 0,
            voice: 0,
            staff: 0,
            ping: 0
        };

        if (app.locals.discordClient) {
            const client = app.locals.discordClient;
            const guild = client.guilds.cache.get(guildId);

            if (guild) {
                discordStats.online = guild.memberCount;
                discordStats.ping = client.ws.ping;
                
                try {
                    discordStats.voice = guild.voiceStates.cache.filter(vs => vs.channelId).size;
                } catch (e) {
                    discordStats.voice = 0;
                }

                // Staff Online: contar basándose en roles configurados
                const guildSettings = await prisma.guildSettings.findUnique({
                    where: { guildId }
                });

                console.log(`[DEBUG] Guild ${guildId} - staffRoles from DB:`, guildSettings?.staffRoles);

                if (guildSettings?.staffRoles && guildSettings.staffRoles !== 'null') {
                    try {
                        const staffRoleIds = JSON.parse(guildSettings.staffRoles);
                        console.log(`[DEBUG] Parsed staffRoleIds:`, staffRoleIds);
                        
                        const staffMembers = guild.members.cache.filter(m => {
                            if (m.user.bot || !m.presence || m.presence.status === 'offline') return false;
                            // Verificar si tiene al menos uno de los roles de staff configurados
                            const isStaff = m.roles.cache.some(role => staffRoleIds.includes(role.id));
                            if (isStaff) console.log(`[DEBUG] Staff found: ${m.user.username} (${m.id})`);
                            return isStaff;
                        });
                        
                        discordStats.staff = staffMembers.size;
                        console.log(`[DEBUG] Total staff: ${discordStats.staff}`);
                    } catch (e) {
                        console.error(`[ERROR] Parsing staffRoles: ${e.message}`);
                        discordStats.staff = 0;
                    }
                } else {
                    // Fallback: si no hay roles configurados, usar permisos
                    console.log(`[DEBUG] Using fallback permissions for staff counting`);
                    discordStats.staff = guild.members.cache.filter(m => {
                        if (m.user.bot || !m.presence || m.presence.status === 'offline') return false;
                        return m.roles.cache.some(role => 
                            role.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
                            role.permissions.has(PermissionsBitField.Flags.Administrator)
                        );
                    }).size;
                }
            }
        }

        res.render('index', {
            user: req.user,
            selectedGuild: req.selectedGuild,
            adminGuilds: req.adminGuilds,
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
    const guildId = req.selectedGuild.id;

    const where = { guildId };
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
        where: { guildId },
        _count: { type: true }
    });

    res.render('tickets', { 
        tickets, 
        user: req.user, 
        selectedGuild: req.selectedGuild,
        adminGuilds: req.adminGuilds,
        filters: { status, type, claimed }, 
        types 
    });
});

// Ruta para ver Logs Completos (PROTEGIDA)
app.get('/logs', checkAuth, async (req, res) => {
    const guildId = req.selectedGuild.id;
    const logs = await prisma.activityLog.findMany({
        where: { guildId },
        orderBy: { timestamp: 'desc' },
        take: 100
    });
    res.render('logs', { 
        logs, 
        user: req.user,
        selectedGuild: req.selectedGuild,
        adminGuilds: req.adminGuilds
    });
});

// Ruta de Configuración del Servidor (PROTEGIDA)
app.get('/configuracion', checkAuth, async (req, res) => {
    try {
        const guildId = req.selectedGuild.id;
        const guildSettings = await prisma.guildSettings.findUnique({
            where: { guildId }
        });

        // Si no existe configuración, crear una vacía
        const settings = guildSettings || {
            guildId,
            logsChannel: null,
            debugChannel: null,
            verifyChannel: null,
            welcomeChannel: null,
            supportChannel: null,
            roleUser: null,
            roleNoVerify: null,
            roleMuted: null,
            ticketLogsChannel: null,
            ticketPanelChannel: null,
            ticketPanelMessage: null,
            isSetup: false
        };

        // Obtener canales y roles del servidor para los selectores
        const guild = app.locals.discordClient.guilds.cache.get(guildId);
        const channels = guild ? guild.channels.cache
            .filter(c => c.type === 0) // Solo canales de texto
            .map(c => ({ id: c.id, name: c.name }))
            .sort((a, b) => a.name.localeCompare(b.name)) : [];
        
        const roles = guild ? guild.roles.cache
            .filter(r => !r.managed && r.name !== '@everyone')
            .map(r => ({ id: r.id, name: r.name }))
            .sort((a, b) => a.name.localeCompare(b.name)) : [];

        res.render('configuracion', { 
            user: req.user, 
            selectedGuild: req.selectedGuild,
            adminGuilds: req.adminGuilds,
            settings,
            channels,
            roles,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        res.status(500).send("Error cargando configuración: " + error.message);
    }
});

// Ruta POST para guardar configuración
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/configuracion/save', checkAuth, async (req, res) => {
    try {
        const guildId = req.selectedGuild.id;
        const {
            logsChannel,
            debugChannel,
            verifyChannel,
            welcomeChannel,
            supportChannel,
            roleUser,
            roleNoVerify,
            roleMuted,
            ticketLogsChannel,
            staffRoles
        } = req.body;

        // Procesar staffRoles (puede venir como array o string único)
        let staffRolesJson = null;
        if (staffRoles) {
            const rolesArray = Array.isArray(staffRoles) ? staffRoles : [staffRoles];
            staffRolesJson = JSON.stringify(rolesArray);
        }

        await prisma.guildSettings.upsert({
            where: { guildId },
            update: {
                logsChannel: logsChannel || null,
                debugChannel: debugChannel || null,
                verifyChannel: verifyChannel || null,
                welcomeChannel: welcomeChannel || null,
                supportChannel: supportChannel || null,
                roleUser: roleUser || null,
                roleNoVerify: roleNoVerify || null,
                roleMuted: roleMuted || null,
                ticketLogsChannel: ticketLogsChannel || null,
                staffRoles: staffRolesJson,
                isSetup: true
            },
            create: {
                guildId,
                logsChannel: logsChannel || null,
                debugChannel: debugChannel || null,
                verifyChannel: verifyChannel || null,
                welcomeChannel: welcomeChannel || null,
                supportChannel: supportChannel || null,
                roleUser: roleUser || null,
                roleNoVerify: roleNoVerify || null,
                roleMuted: roleMuted || null,
                ticketLogsChannel: ticketLogsChannel || null,
                staffRoles: staffRolesJson,
                isSetup: true
            }
        });

        res.redirect('/configuracion?success=1');
    } catch (error) {
        res.redirect('/configuracion?error=' + encodeURIComponent(error.message));
    }
});

// Ruta de Vista General de Todos los Servidores (PROTEGIDA)
app.get('/servidores', checkAuth, async (req, res) => {
    try {
        const client = app.locals.discordClient;
        const serversData = [];

        for (const guildInfo of req.adminGuilds) {
            const guild = client.guilds.cache.get(guildInfo.id);
            if (!guild) continue;

            // Obtener estadísticas del servidor
            const [ticketsOpen, warnsTotal, logsCount] = await Promise.all([
                prisma.ticket.count({ where: { guildId: guild.id, status: 'open' } }),
                prisma.warn.aggregate({ where: { guildId: guild.id }, _sum: { count: true } }),
                prisma.activityLog.count({ where: { guildId: guild.id } })
            ]);

            const settings = await prisma.guildSettings.findUnique({
                where: { guildId: guild.id }
            });

            serversData.push({
                id: guild.id,
                name: guild.name,
                icon: guild.icon,
                memberCount: guild.memberCount,
                isSetup: settings?.isSetup || false,
                stats: {
                    ticketsOpen,
                    warnsTotal: warnsTotal._sum.count || 0,
                    logsCount
                }
            });
        }

        res.render('servidores', {
            user: req.user,
            adminGuilds: req.adminGuilds,
            selectedGuild: req.selectedGuild,
            serversData
        });
    } catch (error) {
        res.status(500).send("Error cargando servidores: " + error.message);
    }
});

// Ruta de Vista General / Análisis Global de Todos los Servidores (PROTEGIDA)
app.get('/overview', checkAuth, async (req, res) => {
    try {
        const client = app.locals.discordClient;
        const guildIds = req.adminGuilds.map(g => g.id);

        // Estadísticas globales
        const [
            totalTicketsOpen,
            totalWarns,
            totalLogs,
            allWarns
        ] = await Promise.all([
            prisma.ticket.count({ 
                where: { 
                    guildId: { in: guildIds },
                    status: 'open' 
                } 
            }),
            prisma.warn.aggregate({ 
                where: { guildId: { in: guildIds } },
                _sum: { count: true },
                _count: true
            }),
            prisma.activityLog.count({ 
                where: { guildId: { in: guildIds } }
            }),
            prisma.warn.findMany({
                where: { guildId: { in: guildIds } },
                select: { userId: true }
            })
        ]);

        // Usuarios únicos con warns (sin duplicados entre servidores)
        const uniqueUsersWarned = new Set(allWarns.map(w => w.userId)).size;

        // Datos por servidor
        const serversData = [];
        let totalMembers = 0;
        let totalVoice = 0;
        let totalStaffOnline = 0;

        for (const guildInfo of req.adminGuilds) {
            const guild = client.guilds.cache.get(guildInfo.id);
            if (!guild) continue;

            totalMembers += guild.memberCount;

            try {
                totalVoice += guild.voiceStates.cache.filter(vs => vs.channelId).size;
            } catch (e) {
                // Ignorar errores
            }

            // Obtener configuración de roles de staff
            const guildSettings = await prisma.guildSettings.findUnique({
                where: { guildId: guild.id }
            });

            let staffOnline = 0;
            if (guildSettings?.staffRoles) {
                try {
                    const staffRoleIds = JSON.parse(guildSettings.staffRoles);
                    staffOnline = guild.members.cache.filter(m => {
                        if (m.user.bot || !m.presence || m.presence.status === 'offline') return false;
                        return m.roles.cache.some(role => staffRoleIds.includes(role.id));
                    }).size;
                } catch (e) {
                    staffOnline = 0;
                }
            } else {
                // Fallback: usar permisos
                staffOnline = guild.members.cache.filter(m => {
                    if (m.user.bot || !m.presence || m.presence.status === 'offline') return false;
                    return m.roles.cache.some(role => 
                        role.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
                        role.permissions.has(PermissionsBitField.Flags.Administrator)
                    );
                }).size;
            }

            totalStaffOnline += staffOnline;

            const [ticketsOpen, warnsData] = await Promise.all([
                prisma.ticket.count({ 
                    where: { guildId: guild.id, status: 'open' } 
                }),
                prisma.warn.aggregate({ 
                    where: { guildId: guild.id },
                    _sum: { count: true }
                })
            ]);

            serversData.push({
                id: guild.id,
                name: guild.name,
                icon: guild.icon,
                memberCount: guild.memberCount,
                ticketsOpen,
                warnsTotal: warnsData._sum.count || 0,
                voiceCount: guild.voiceStates.cache.filter(vs => vs.channelId).size,
                staffOnline
            });
        }

        // Últimas actividades de todos los servidores
        const recentLogs = await prisma.activityLog.findMany({
            where: { guildId: { in: guildIds } },
            orderBy: { timestamp: 'desc' },
            take: 15
        });

        res.render('overview', {
            user: req.user,
            adminGuilds: req.adminGuilds,
            selectedGuild: { name: 'Análisis General', icon: null },
            globalStats: {
                totalServers: req.adminGuilds.length,
                totalMembers,
                totalTicketsOpen,
                totalWarns: totalWarns._sum.count || 0,
                uniqueUsersWarned,
                totalLogs,
                totalVoice,
                totalStaffOnline,
                avgPing: client.ws.ping
            },
            serversData,
            recentLogs
        });
    } catch (error) {
        console.error('Error en overview:', error);
        res.status(500).send("Error cargando análisis general: " + error.message);
    }
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