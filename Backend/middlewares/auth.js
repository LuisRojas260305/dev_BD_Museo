const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
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
    if (req.usuario.tipo !== 'administrador') {
        return res.status(403).json({ error: 'Requiere permisos de administrador' });
    }
    next();
};

const verificarMiembro = (req, res, next) => {
    if (req.usuario.tipo !== 'miembro' && req.usuario.tipo !== 'administrador') {
        return res.status(403).json({ error: 'Requiere ser miembro' });
    }
    next();
};

module.exports = { verificarToken, verificarAdmin, verificarMiembro };