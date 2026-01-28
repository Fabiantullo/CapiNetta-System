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

                // Staff Online: contar basándose en roles configurados y presence (online status)
                const guildSettings = await prisma.guildSettings.findUnique({
                    where: { guildId }
                });

                if (guildSettings?.staffRoles && guildSettings.staffRoles !== 'null') {
                    try {
                        const staffRoleIds = JSON.parse(guildSettings.staffRoles);
                        
                        // Obtener miembros con información de presence actualizada
                        let members = guild.members.cache;
                        
                        // Si hay pocos miembros en caché, intentar fetcharlos
                        if (members.size < guild.memberCount) {
                            try {
                                await guild.members.fetch({ force: true });
                                members = guild.members.cache;
                            } catch (e) {
                                // Silently handle fetch errors
                            }
                        }
                        
                        discordStats.staff = members.filter(m => {
                            if (m.user.bot) return false;
                            const isOnline = m.presence?.status !== 'offline' && m.presence?.status !== undefined;
                            const hasStaffRole = m.roles.cache.some(role => staffRoleIds.includes(role.id));
                            return isOnline && hasStaffRole;
                        }).size;
                    } catch (e) {
                        discordStats.staff = 0;
                    }
                } else {
                    // Fallback: si no hay roles configurados, usar permisos
                    discordStats.staff = guild.members.cache.filter(m => {
                        if (m.user.bot) return false;
                        if (m.presence?.status === 'offline' || m.presence?.status === undefined) return false;
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

// Ruta para Sistema de Warns (PROTEGIDA)
app.get('/warns', checkAuth, async (req, res) => {
    try {
        const guildId = req.selectedGuild.id;
        const guild = app.locals.discordClient.guilds.cache.get(guildId);

        // Obtener todos los warns del servidor
        const warns = await prisma.warn.findMany({
            where: { guildId }
        });

        // Estadísticas
        const totalUsers = warns.length;
        const totalWarns = warns.reduce((sum, w) => sum + w.count, 0);
        const avgWarns = totalUsers > 0 ? totalWarns / totalUsers : 0;

        // Warns recientes (últimas 24 horas)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentLogs = await prisma.warnLog.findMany({
            where: {
                timestamp: { gte: oneDayAgo }
            },
            orderBy: { timestamp: 'desc' }
        });
        const recentWarns = recentLogs.length;

        // Enriquecer datos de warns con info de Discord
        const enrichedWarns = await Promise.all(warns.map(async (warn) => {
            try {
                const member = await guild.members.fetch(warn.userId);
                const lastLog = await prisma.warnLog.findFirst({
                    where: { userId: warn.userId },
                    orderBy: { timestamp: 'desc' }
                });

                return {
                    userId: warn.userId,
                    username: member.user.username,
                    avatar: member.user.displayAvatarURL({ size: 64 }),
                    count: warn.count,
                    lastWarnDate: lastLog ? new Date(lastLog.timestamp).toLocaleDateString('es-AR') : null
                };
            } catch (e) {
                return {
                    userId: warn.userId,
                    username: 'Usuario Desconocido',
                    avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
                    count: warn.count,
                    lastWarnDate: null
                };
            }
        }));

        // Ordenar por cantidad de warns (mayor a menor)
        enrichedWarns.sort((a, b) => b.count - a.count);

        // Actividad reciente con nombres de usuarios
        const recentActivity = await Promise.all(recentLogs.slice(0, 10).map(async (log) => {
            try {
                const user = await guild.members.fetch(log.userId);
                const moderator = await guild.members.fetch(log.moderatorId);
                
                return {
                    username: user.user.username,
                    moderatorName: moderator.user.username,
                    warnNumber: log.warnNumber,
                    reason: log.reason,
                    timestamp: new Date(log.timestamp).toLocaleString('es-AR')
                };
            } catch (e) {
                return {
                    username: 'Usuario Desconocido',
                    moderatorName: 'Moderador Desconocido',
                    warnNumber: log.warnNumber,
                    reason: log.reason,
                    timestamp: new Date(log.timestamp).toLocaleString('es-AR')
                };
            }
        }));

        res.render('warns', {
            warns: enrichedWarns,
            totalUsers,
            totalWarns,
            avgWarns,
            recentWarns,
            recentActivity,
            user: req.user,
            selectedGuild: req.selectedGuild,
            adminGuilds: req.adminGuilds
        });
    } catch (error) {
        console.error('Error loading warns:', error);
        res.status(500).send('Error al cargar el sistema de warns');
    }
});

// =============================================================================
//                          GESTIÓN DE ROLES
// =============================================================================

app.get('/roles', checkAuth, async (req, res) => {
    try {
        const guildId = req.selectedGuild.id;
        const guild = app.locals.discordClient.guilds.cache.get(guildId);

        if (!guild) {
            return res.status(404).send('Servidor no encontrado');
        }

        // Obtener todos los roles
        const allRoles = guild.roles.cache
            .filter(role => !role.managed && role.id !== guildId) // Excluir roles manejados y @everyone
            .map(role => ({
                id: role.id,
                name: role.name,
                color: role.hexColor || '#808080',
                memberCount: role.members.size,
                permissions: Array.from(role.permissions.toArray()),
                type: role.id === guildId ? 'default' : 'custom'
            }))
            .sort((a, b) => b.memberCount - a.memberCount);

        // Obtener roles de staff desde la base de datos
        const guildSettings = await prisma.guildSettings.findUnique({
            where: { guildId }
        });

        const staffRoleIds = guildSettings?.staffRoles ? JSON.parse(guildSettings.staffRoles) : [];
        
        // Marcar roles de staff
        const rolesWithType = allRoles.map(role => ({
            ...role,
            type: staffRoleIds.includes(role.id) ? 'staff' : 'custom'
        }));

        // Estadísticas
        const totalRoles = rolesWithType.length;
        const staffRolesCount = rolesWithType.filter(r => r.type === 'staff').length;
        const assignedUsers = new Set(
            rolesWithType.reduce((acc, role) => {
                guild.roles.cache.get(role.id)?.members.forEach(member => {
                    if (!member.user.bot) acc.push(member.id);
                });
                return acc;
            }, [])
        ).size;

        // Contar permisos únicos
        const allPermissions = new Set();
        rolesWithType.forEach(role => {
            role.permissions.forEach(perm => allPermissions.add(perm));
        });

        res.render('roles', {
            roles: rolesWithType,
            totalRoles,
            staffRoles: staffRolesCount,
            assignedUsers,
            totalPermissions: allPermissions.size,
            user: req.user,
            selectedGuild: req.selectedGuild,
            adminGuilds: req.adminGuilds
        });
    } catch (error) {
        console.error('Error loading roles:', error);
        res.status(500).send('Error al cargar la gestión de roles');
    }
});

// =============================================================================
//                    ENDPOINTS PARA EDITAR/ELIMINAR ROLES
// =============================================================================

// Editar rol (color y permisos)
app.post('/roles/edit/:roleId', checkAuth, async (req, res) => {
    try {
        const guildId = req.selectedGuild.id;
        const { roleId } = req.params;
        const { color, permissions } = req.body;

        const guild = app.locals.discordClient.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ message: 'Servidor no encontrado' });
        }

        const role = guild.roles.cache.get(roleId);
        if (!role) {
            return res.status(404).json({ message: 'Rol no encontrado' });
        }

        // Validar que no sea un rol manejado por Discord
        if (role.managed) {
            return res.status(403).json({ message: 'No puedes editar roles manejados por Discord' });
        }

        // Convertir permisos a BitField
        const { PermissionsBitField } = require('discord.js');
        const permissionBits = new PermissionsBitField(permissions);

        // Actualizar el rol
        await role.edit({
            color: color || role.color,
            permissions: permissionBits,
            reason: 'Editado desde el Dashboard'
        });

        res.json({
            success: true,
            message: 'Rol actualizado correctamente'
        });
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al actualizar el rol'
        });
    }
});

// Eliminar rol
app.post('/roles/delete/:roleId', checkAuth, async (req, res) => {
    try {
        const guildId = req.selectedGuild.id;
        const { roleId } = req.params;

        const guild = app.locals.discordClient.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ message: 'Servidor no encontrado' });
        }

        const role = guild.roles.cache.get(roleId);
        if (!role) {
            return res.status(404).json({ message: 'Rol no encontrado' });
        }

        // Validar que no sea un rol manejado por Discord o @everyone
        if (role.managed || role.id === guildId) {
            return res.status(403).json({ message: 'No puedes eliminar este rol' });
        }

        const roleName = role.name;

        // Eliminar el rol
        await role.delete('Eliminado desde el Dashboard');

        // Registrar actividad
        await prisma.activityLog.create({
            data: {
                guildId,
                action: 'ROLE_DELETED',
                target: roleName,
                details: `Rol "${roleName}" (${roleId}) eliminado`
            }
        });

        res.json({
            success: true,
            message: `Rol "${roleName}" eliminado correctamente`
        });
    } catch (error) {
        console.error('Error deleting role:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al eliminar el rol'
        });
    }
});

// Endpoint para resetear warns
app.post('/warns/reset/:userId', checkAuth, async (req, res) => {
    try {
        const guildId = req.selectedGuild.id;
        const { userId } = req.params;

        await prisma.warn.delete({
            where: {
                guildId_userId: {
                    guildId,
                    userId
                }
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error resetting warns:', error);
        res.json({ success: false, error: error.message });
    }
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
                        if (m.user.bot) return false;
                        const isOnline = m.presence?.status !== 'offline' && m.presence?.status !== undefined;
                        return isOnline && m.roles.cache.some(role => staffRoleIds.includes(role.id));
                    }).size;
                } catch (e) {
                    staffOnline = 0;
                }
            } else {
                // Fallback: usar presence + permisos
                staffOnline = guild.members.cache.filter(m => {
                    if (m.user.bot) return false;
                    const isOnline = m.presence?.status !== 'offline' && m.presence?.status !== undefined;
                    return isOnline && m.roles.cache.some(role => 
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