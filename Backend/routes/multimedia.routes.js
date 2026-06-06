/**
 * Routes for serving multimedia files (photos).
 *
 * Fetches binary photo data from the MySQL Multimedia table
 * and serves it with the appropriate MIME type and caching headers.
 *
 * @module routes/multimedia
 */

const router = require('express').Router();
const multimediaHelper = require('../services/multimediaHelper');

/**
 * GET /api/multimedia/:id
 * Serve a binary photo by its ID.
 * @route GET /api/multimedia/:id
 * @param {string} req.params.id - Multimedia record ID
 * @returns {Buffer} 200 - Binary photo data with proper Content-Type
 * @returns {Object} 404 - Photo not found
 * @header Cache-Control - public, max-age=86400 (1 day)
 */
router.get('/:id', async (req, res, next) => {
    try {
        const foto = await multimediaHelper.getFoto(req.params.id);
        if (!foto) {
            return res.status(404).json({ error: 'Foto no encontrada' });
        }
        res.set('Content-Type', foto.tipo_mime);
        res.set('Cache-Control', 'public, max-age=86400'); // 1-day browser cache
        res.send(foto.archivo);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
