/**
 * Middleware de autenticación y autorización.
 * Soporta JWT (Bearer token) e internal API key para comunicación service-to-service.
 * Provee verificación de token, roles (admin/miembro) y autenticación opcional.
 */
const jwt = require('jsonwebtoken');

/**
 * Verifica el token JWT o la internal API key en el request.
 * Si es válido, inyecta req.usuario con los datos del usuario autenticado.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
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
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = verified;
        next();
    } catch (error) {
        res.status(400).json({ error: 'Token inválido' });
    }
};

/**
 * Verifica que el usuario autenticado sea administrador.
 * Debe ejecutarse después de verificarToken.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const verificarAdmin = (req, res, next) => {
    if (req.usuario.tipo !== 'administrador')
        return res.status(403).json({ error: 'Requiere permisos de administrador' });
    next();
};

/**
 * Verifica que el usuario autenticado sea miembro o administrador.
 * Debe ejecutarse después de verificarToken.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const verificarMiembro = (req, res, next) => {
    if (req.usuario.tipo !== 'miembro' && req.usuario.tipo !== 'administrador')
        return res.status(403).json({ error: 'Requiere ser miembro' });
    next();
};

/**
 * Autenticación opcional — si hay token o internal key lo verifica,
 * si no, continúa sin inyectar req.usuario.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const opcionalAuth = (req, res, next) => {
    const internalKey = req.header('x-internal-key');
    if (internalKey && internalKey === process.env.INTERNAL_API_KEY) {
        req.usuario = { tipo: 'sistema', email: 'sistema@interna' };
        return next();
    }

    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return next();

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = verified;
    } catch {
        // token inválido, sigue como no autenticado
    }
    next();
};

module.exports = { verificarToken, verificarAdmin, verificarMiembro, opcionalAuth };
