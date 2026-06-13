/**
 * Middleware de autenticación y autorización.
 * Módulo standalone - solo depende de jsonwebtoken (sin dependencia MySQL).
 * Misma interfaz que el auth original: verificarToken, verificarAdmin,
 * verificarMiembro, opcionalAuth. Copiado del patrón de cassandra-service.
 */
const jwt = require('jsonwebtoken');

/**
 * Verifica el token JWT o la internal API key para service-to-service.
 * Si pasa, deja los datos del usuario en req.usuario.
 */
const verificarToken = (req, res, next) => {
    const internalKey = req.header('x-internal-key');
    if (internalKey && internalKey === process.env.INTERNAL_API_KEY) {
        req.usuario = { tipo: 'sistema', email: 'sistema@interna' };
        return next();
    }

    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Acceso denegado' });
    try {
        req.usuario = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        res.status(400).json({ error: 'Token inválido' });
    }
};

/** Rechaza la solicitud si el usuario no es administrador o sistema. */
const verificarAdmin = (req, res, next) => {
    if (req.usuario.tipo !== 'administrador' && req.usuario.tipo !== 'sistema')
        return res.status(403).json({ error: 'Requiere permisos de administrador' });
    next();
};

/** Rechaza la solicitud si el usuario no es miembro o administrador. */
const verificarMiembro = (req, res, next) => {
    if (req.usuario.tipo !== 'miembro' && req.usuario.tipo !== 'administrador')
        return res.status(403).json({ error: 'Requiere ser miembro' });
    next();
};

/** Auth opcional - si hay token o internal key lo verifica, si no, continúa sin usuario. */
const opcionalAuth = (req, res, next) => {
    const internalKey = req.header('x-internal-key');
    if (internalKey && internalKey === process.env.INTERNAL_API_KEY) {
        req.usuario = { tipo: 'sistema', email: 'sistema@interna' };
        return next();
    }

    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return next();

    try {
        req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        // token inválido, sigue como no autenticado
    }
    next();
};

module.exports = { verificarToken, verificarAdmin, verificarMiembro, opcionalAuth };
