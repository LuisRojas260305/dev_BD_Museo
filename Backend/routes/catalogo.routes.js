// /api/catalogo — Proxy a mongodb-service
// Reemplaza a /api/obras para consulta pública de catálogo.
const router = require('express').Router();
const multer = require('multer');
const catalogProxy = require('../services/catalogProxy');
const multimediaHelper = require('../services/multimediaHelper');
const sslMiddleware = require('../shared/sslMiddleware');
const { opcionalAuth, verificarToken, verificarAdmin } = require('../shared/auth');
const { addView } = require('../shared/sslContext');
const { logEvent } = require('../shared/sslLogger');

// Multer — upload de fotos en memoria (máx 5 MB)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
});

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

// GET /api/catalogo/artistas — Listar artistas (proxy a MongoDB)
router.get('/artistas', async (req, res, next) => {
    try {
        const data = await catalogProxy.getArtists(req.query);
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

// ---------------------------------------------------------------------------
// CRUD de Obras (admin) — requieren autenticación JWT + admin
// ---------------------------------------------------------------------------

// POST /api/catalogo/obras — Crear obra (con foto opcional)
router.post('/obras', verificarToken, verificarAdmin, upload.single('foto'), async (req, res, next) => {
    try {
        let fotoUrl = null;

        // Si hay foto, guardarla en MySQL Multimedia y obtener URL
        if (req.file) {
            const multimediaId = await multimediaHelper.saveFoto(
                'obra',
                null, // entidad_id se actualiza después de crear la obra si se necesita
                req.file.buffer,
                req.file.mimetype
            );
            fotoUrl = `/api/multimedia/${multimediaId}`;
        }

        // Armar datos de obra (sin la foto binaria, solo referencia)
        const obraData = { ...req.body };
        if (fotoUrl) {
            obraData.fotos = [fotoUrl];
        }

        const obra = await catalogProxy.createObra(obraData);
        res.status(201).json(obra);
    } catch (err) {
        next(err);
    }
});

// PUT /api/catalogo/obras/:id — Actualizar obra (foto opcional)
router.put('/obras/:id', verificarToken, verificarAdmin, upload.single('foto'), async (req, res, next) => {
    try {
        const { id } = req.params;
        let fotoUrl = null;

        // Si hay foto nueva, guardarla y generar URL
        if (req.file) {
            const multimediaId = await multimediaHelper.saveFoto(
                'obra',
                id,
                req.file.buffer,
                req.file.mimetype
            );
            fotoUrl = `/api/multimedia/${multimediaId}`;
        }

        const obraData = { ...req.body };
        if (fotoUrl) {
            obraData.fotos = [fotoUrl];
        }

        const obra = await catalogProxy.updateObra(id, obraData);
        res.json(obra);
    } catch (err) {
        next(err);
    }
});

// DELETE /api/catalogo/obras/:id — Eliminar obra
router.delete('/obras/:id', verificarToken, verificarAdmin, async (req, res, next) => {
    try {
        const { id } = req.params;
        const obra = await catalogProxy.deleteObra(id);
        res.json(obra);
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// CRUD Artistas (admin)
// ---------------------------------------------------------------------------

// POST /api/catalogo/artistas — Crear artista (con foto opcional)
router.post('/artistas', verificarToken, verificarAdmin, upload.single('foto'), async (req, res) => {
    try {
        let fotoUrl = null;
        if (req.file) {
            const multimediaId = await multimediaHelper.saveFoto('artista', null, req.file.buffer, req.file.mimetype);
            fotoUrl = `/api/multimedia/${multimediaId}`;
        }

        const artistData = { ...req.body };
        if (fotoUrl) artistData.fotos = [fotoUrl];

        const artista = await catalogProxy.createArtist(artistData);
        res.status(201).json(artista);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/catalogo/artistas/:id — Actualizar artista (foto opcional)
router.put('/artistas/:id', verificarToken, verificarAdmin, upload.single('foto'), async (req, res) => {
    try {
        const artistData = { ...req.body };
        if (req.file) {
            const multimediaId = await multimediaHelper.saveFoto('artista', null, req.file.buffer, req.file.mimetype);
            artistData.fotos = [`/api/multimedia/${multimediaId}`];
        }

        const artista = await catalogProxy.updateArtist(req.params.id, artistData);
        res.json(artista);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/catalogo/artistas/:id — Eliminar artista
router.delete('/artistas/:id', verificarToken, verificarAdmin, async (req, res) => {
    try {
        const artista = await catalogProxy.deleteArtist(req.params.id);
        res.json(artista);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
