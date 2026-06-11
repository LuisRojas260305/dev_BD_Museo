/**
 * Routes for catalog operations.
 *
 * Proxies catalog requests to the mongodb-service (MongoDB).
 * Handles artworks, artists, genres, and SSL context initialization.
 * Public routes have optional auth; admin CRUD routes require JWT + admin role.
 * Artwork and artist creation/update support optional photo upload via multer.
 *
 * @module routes/catalogo
 */

const router = require('express').Router();
const multer = require('multer');
const catalogProxy = require('../services/catalogProxy');
const multimediaHelper = require('../services/multimediaHelper');
const sslMiddleware = require('../shared/sslMiddleware');
const { opcionalAuth, verificarToken, verificarAdmin } = require('../shared/auth');
const { addView } = require('../shared/sslContext');
const { logEvent } = require('../shared/sslLogger');

// Multer - in-memory photo upload, max 5 MB
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
});

// Apply SSL middleware and optional auth to all catalog routes
router.use(sslMiddleware);
router.use(opcionalAuth);

/**
 * GET /api/catalogo
 * List catalog artworks (proxied to MongoDB).
 * @route GET /api/catalogo
 * @query {Object} req.query - Query parameters forwarded to the catalog service
 * @returns {Object} 200 - Catalog artworks list
 * @returns {Object} 503 - Catalog service unavailable
 */
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

/**
 * GET /api/catalogo/search
 * Search catalog artworks (proxied to MongoDB).
 * @route GET /api/catalogo/search
 * @query {Object} req.query - Search parameters forwarded to the catalog service
 * @returns {Object} 200 - Search results
 * @returns {Object} 503 - Search service unavailable
 */
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

/**
 * GET /api/catalogo/ssl/contexto
 * Initialize an SSL context for the session.
 * Propagates the ssl_id to the response header for the frontend to store.
 * Falls back to creating a local context if the catalog service is unavailable.
 * @route GET /api/catalogo/ssl/contexto
 * @returns {Object} 200 - SSL context data with x-ssl-id header
 */
router.get('/ssl/contexto', async (req, res, next) => {
    try {
        const data = await catalogProxy.createSslContext();
        // Propagate ssl_id to response header so the frontend can store it
        if (data?.data?.ssl_id) {
            res.setHeader('x-ssl-id', data.data.ssl_id);
        }
        res.json(data);
    } catch (err) {
        // Fallback: create SSL context locally
        const { createContext } = require('../shared/sslContext');
        const ctx = createContext();
        res.setHeader('x-ssl-id', ctx.ssl_id);
        res.json({ success: true, data: { ssl_id: ctx.ssl_id, creado_en: ctx.creado_en, ttl: ctx.ttl } });
    }
});

/**
 * GET /api/catalogo/artistas
 * List artists (proxied to MongoDB).
 * @route GET /api/catalogo/artistas
 * @query {Object} req.query - Query parameters forwarded to the catalog service
 * @returns {Object} 200 - Artists list
 * @returns {Object} 503 - Catalog service unavailable
 */
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

/**
 * GET /api/catalogo/artistas/:id
 * Get an artist by ID (proxied to MongoDB).
 * @route GET /api/catalogo/artistas/:id
 * @param {string} req.params.id - Artist ID
 * @query {Object} req.query - Additional query parameters
 * @returns {Object} 200 - Artist data
 * @returns {Object} 503 - Catalog service unavailable
 */
router.get('/artistas/:id', async (req, res, next) => {
    try {
        const data = await catalogProxy.getArtistById(req.params.id, req.query);
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
// Genres CRUD (admin)
// ---------------------------------------------------------------------------

/**
 * GET /api/catalogo/generos
 * List all genres (public).
 * @route GET /api/catalogo/generos
 * @query {Object} req.query - Query parameters forwarded to the catalog service
 * @returns {Object} 200 - Genres list
 * @returns {Object} 503 - Catalog service unavailable
 */
router.get('/generos', async (req, res, next) => {
  try {
    const data = await catalogProxy.getGeneros(req.query);
    res.json(data);
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ECONNABORTED') {
      return res.status(503).json({
        success: false,
        error: 'Catálogo no disponible',
        details: 'El servicio de catálogo (MongoDB) no está disponible',
      });
    }
    next(err);
  }
});

/**
 * GET /api/catalogo/generos/:id
 * Get a genre by ID (public).
 * @route GET /api/catalogo/generos/:id
 * @param {string} req.params.id - Genre ID
 * @returns {Object} 200 - Genre data
 * @returns {Object} 503 - Catalog service unavailable
 */
router.get('/generos/:id', async (req, res, next) => {
  try {
    const data = await catalogProxy.getGeneroById(req.params.id);
    res.json(data);
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ECONNABORTED') {
      return res.status(503).json({
        success: false,
        error: 'Catálogo no disponible',
        details: 'El servicio de catálogo (MongoDB) no está disponible',
      });
    }
    next(err);
  }
});

/**
 * POST /api/catalogo/generos
 * Create a new genre (admin only).
 * @route POST /api/catalogo/generos
 * @auth Requires JWT + admin role
 * @body {Object} req.body - Genre data
 * @returns {Object} 201 - Created genre
 */
router.post('/generos', verificarToken, verificarAdmin, async (req, res, next) => {
  try {
    const data = await catalogProxy.createGenero(req.body);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/catalogo/generos/:id
 * Update a genre by ID (admin only).
 * @route PUT /api/catalogo/generos/:id
 * @auth Requires JWT + admin role
 * @param {string} req.params.id - Genre ID
 * @body {Object} req.body - Updated genre data
 * @returns {Object} 200 - Updated genre
 */
router.put('/generos/:id', verificarToken, verificarAdmin, async (req, res, next) => {
  try {
    const data = await catalogProxy.updateGenero(req.params.id, req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/catalogo/generos/:id
 * Delete a genre by ID (admin only).
 * @route DELETE /api/catalogo/generos/:id
 * @auth Requires JWT + admin role
 * @param {string} req.params.id - Genre ID
 * @returns {Object} 200 - Deletion result
 */
router.delete('/generos/:id', verificarToken, verificarAdmin, async (req, res, next) => {
  try {
    const data = await catalogProxy.deleteGenero(req.params.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/catalogo/:id
 * Get an artwork by ID (must be defined LAST to avoid capturing specific sub-routes).
 * Also registers an SSL view event for the artwork.
 * @route GET /api/catalogo/:id
 * @param {string} req.params.id - Artwork ID
 * @query {Object} req.query - Additional query parameters
 * @returns {Object} 200 - Artwork data
 * @returns {Object} 503 - Catalog service unavailable
 */
router.get('/:id', async (req, res, next) => {
    try {
        const data = await catalogProxy.getCatalogById(req.params.id, req.query);

        // SSL - register artwork view
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
// Artworks CRUD (admin)
// ---------------------------------------------------------------------------

/**
 * POST /api/catalogo/obras
 * Create a new artwork with an optional photo (admin only).
 * @route POST /api/catalogo/obras
 * @auth Requires JWT + admin role
 * @body {Object} req.body - Artwork data
 * @body {File} [req.file] - Optional photo uploaded via multer
 * @returns {Object} 201 - Created artwork
 */
router.post('/obras', verificarToken, verificarAdmin, upload.single('foto'), async (req, res, next) => {
    try {
        let fotoUrl = null;

        // If a photo was uploaded, save it to MySQL Multimedia and get its URL
        if (req.file) {
            const multimediaId = await multimediaHelper.saveFoto(
                'obra',
                null, // entity_id will be updated after creation if needed
                req.file.buffer,
                req.file.mimetype
            );
            fotoUrl = `/api/multimedia/${multimediaId}`;
        }

        // Build artwork data without the binary photo, only the URL reference
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

/**
 * PUT /api/catalogo/obras/:id
 * Update an artwork with an optional new photo (admin only).
 * @route PUT /api/catalogo/obras/:id
 * @auth Requires JWT + admin role
 * @param {string} req.params.id - Artwork ID
 * @body {Object} req.body - Updated artwork data
 * @body {File} [req.file] - Optional new photo uploaded via multer
 * @returns {Object} 200 - Updated artwork
 */
router.put('/obras/:id', verificarToken, verificarAdmin, upload.single('foto'), async (req, res, next) => {
    try {
        const { id } = req.params;
        let fotoUrl = null;

        // If a new photo was uploaded, save it and generate the URL
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

/**
 * DELETE /api/catalogo/obras/:id
 * Delete an artwork by ID (admin only).
 * @route DELETE /api/catalogo/obras/:id
 * @auth Requires JWT + admin role
 * @param {string} req.params.id - Artwork ID
 * @returns {Object} 200 - Deletion result
 */
router.delete('/obras/:id', verificarToken, verificarAdmin, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { pool } = require('../config/database');
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM Venta WHERE obra_id = ?', [id]);
        if (rows[0].count > 0) {
            return res.status(409).json({
                success: false,
                error: `No se puede eliminar: la obra tiene ${rows[0].count} venta(s) registrada(s).`
            });
        }
        const obra = await catalogProxy.deleteObra(id);
        res.json(obra);
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// Artists CRUD (admin)
// ---------------------------------------------------------------------------

/**
 * POST /api/catalogo/artistas
 * Create a new artist with an optional photo (admin only).
 * @route POST /api/catalogo/artistas
 * @auth Requires JWT + admin role
 * @body {Object} req.body - Artist data
 * @body {File} [req.file] - Optional photo uploaded via multer
 * @returns {Object} 201 - Created artist
 */
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

/**
 * PUT /api/catalogo/artistas/:id
 * Update an artist with an optional new photo (admin only).
 * @route PUT /api/catalogo/artistas/:id
 * @auth Requires JWT + admin role
 * @param {string} req.params.id - Artist ID
 * @body {Object} req.body - Updated artist data
 * @body {File} [req.file] - Optional new photo uploaded via multer
 * @returns {Object} 200 - Updated artist
 */
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

/**
 * DELETE /api/catalogo/artistas/:id
 * Delete an artist by ID (admin only).
 * @route DELETE /api/catalogo/artistas/:id
 * @auth Requires JWT + admin role
 * @param {string} req.params.id - Artist ID
 * @returns {Object} 200 - Deletion result
 */
router.delete('/artistas/:id', verificarToken, verificarAdmin, async (req, res) => {
    try {
        const artista = await catalogProxy.deleteArtist(req.params.id);
        res.json(artista);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
