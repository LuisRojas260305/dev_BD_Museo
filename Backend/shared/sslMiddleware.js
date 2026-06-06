/**
 * Middleware Express que gestiona el Session Context Layer (SSL).
 * Busca x-ssl-id en el header; si no existe, crea un nuevo contexto.
 * Expone req.ssl con el contexto actual de navegación.
 */
const { createContext, getContext } = require('./sslContext');
const { logEvent } = require('./sslLogger');

/**
 * Middleware SSL - inyecta req.ssl con el contexto de navegacion actual.
 * Si el cliente envio x-ssl-id y el contexto sigue vigente, lo reutiliza;
 * de lo contrario crea uno nuevo y lo devuelve en el header de respuesta.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
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
