// /api/catalogo — Proxy a mongodb-service
// Reemplaza a /api/obras para consulta pública de catálogo.
const router = require('express').Router();
const catalogProxy = require('../services/catalogProxy');
const sslMiddleware = require('../shared/sslMiddleware');
const { opcionalAuth } = require('../shared/auth');
const { addView } = require('../shared/sslContext');
const { logEvent } = require('../shared/sslLogger');

// SSL + auth opcional en todas las rutas de catálogo
router.use(sslMiddleware);
router.use(opcionalAuth);

// GET /api/catalogo — Listar obras (proxy a MongoDB)
router.get('/', async (req, res, next) => {
    try {
        const data = await catalogProxy.getCatalog(req.query);
        res.json(data);
    } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ECONNABORTED') {
            return res.status(503).json({
                success: false,
                error: 'Catálogo no disponible',
                details: 'El servicio de catálogo (MongoDB) no está disponible'
            });
        }
        next(err);
    }
});

// GET /api/catalogo/search — Buscar obras
router.get('/search', async (req, res, next) => {
    try {
        const data = await catalogProxy.searchCatalog(req.query);
        res.json(data);
    } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ECONNABORTED') {
            return res.status(503).json({
                success: false,
                error: 'Búsqueda no disponible',
                details: 'El servicio de catálogo (MongoDB) no está disponible'
            });
        }
        next(err);
    }
});

// GET /api/catalogo/ssl/contexto — Inicializar contexto SSL
router.get('/ssl/contexto', async (req, res, next) => {
    try {
        const data = await catalogProxy.createSslContext();
        // Propagar el ssl_id al response header para que el frontend lo guarde
        if (data?.data?.ssl_id) {
            res.setHeader('x-ssl-id', data.data.ssl_id);
        }
        res.json(data);
    } catch (err) {
        // Fallback: crear contexto localmente
        const { createContext } = require('../shared/sslContext');
        const ctx = createContext();
        res.setHeader('x-ssl-id', ctx.ssl_id);
        res.json({ success: true, data: { ssl_id: ctx.ssl_id, creado_en: ctx.creado_en, ttl: ctx.ttl } });
    }
});

// GET /api/catalogo/:id — Obtener obra por ID
router.get('/:id', async (req, res, next) => {
    try {
        const data = await catalogProxy.getCatalogById(req.params.id, req.query);

        // SSL — registrar vista de obra
        const sslId = req.headers['x-ssl-id'] || req.ssl?.ssl_id;
        if (sslId) {
            const ctx = addView(sslId, req.params.id, 'detalle');
            if (ctx) {
                logEvent(sslId, 'vista-obra-proxy', { obra_id: req.params.id });
            }
        }

        res.json(data);
    } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ECONNABORTED') {
            return res.status(503).json({
                success: false,
                error: 'Catálogo no disponible',
                details: 'El servicio de catálogo (MongoDB) no está disponible'
            });
        }
        next(err);
    }
});

module.exports = router;
