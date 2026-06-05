// SSL — Express Middleware
// Gestiona el Session Context Layer automáticamente en cada request.
// Busca x-ssl-id en header, si no existe crea uno nuevo.
// Expone req.ssl con el contexto actual.
const { createContext, getContext } = require('./sslContext');
const { logEvent } = require('./sslLogger');

const sslMiddleware = (req, res, next) => {
    let sslId = req.headers['x-ssl-id'];

    if (sslId) {
        const ctx = getContext(sslId);
        if (ctx) {
            req.ssl = ctx;
            logEvent(sslId, 'request', { path: req.originalUrl, method: req.method });
            return next();
        }
    }

    // Crear nuevo contexto SSL
    const ctx = createContext();
    req.ssl = ctx;

    // Devolver ssl_id en response header para que el frontend lo guarde
    res.setHeader('x-ssl-id', ctx.ssl_id);
    logEvent(ctx.ssl_id, 'contexto-creado', { path: req.originalUrl });

    next();
};

module.exports = sslMiddleware;
