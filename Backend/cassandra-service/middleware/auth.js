// Módulo standalone — solo depende de jsonwebtoken (sin dependencia MySQL)
// Reemplaza a middlewares/auth.js. Misma interfaz: verificarToken, verificarAdmin, verificarMiembro.
// Puede copiarse a mongodb-service/middleware/authMiddleware.js sin cambios.
const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    // Internal API key para service-to-service (monolito → microservicios)
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

const verificarAdmin = (req, res, next) => {
    if (req.usuario.tipo !== 'administrador')
        return res.status(403).json({ error: 'Requiere permisos de administrador' });
    next();
};

const verificarMiembro = (req, res, next) => {
    if (req.usuario.tipo !== 'miembro' && req.usuario.tipo !== 'administrador')
        return res.status(403).json({ error: 'Requiere ser miembro' });
    next();
};

// Auth opcional — si hay token o internal key lo verifica, si no, continúa sin usuario.
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
