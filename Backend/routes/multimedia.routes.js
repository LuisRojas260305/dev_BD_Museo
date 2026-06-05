// /api/multimedia — Servir fotos almacenadas en MySQL (tabla Multimedia)
const router = require('express').Router();
const multimediaHelper = require('../services/multimediaHelper');

// GET /api/multimedia/:id — Servir foto binaria
router.get('/:id', async (req, res, next) => {
    try {
        const foto = await multimediaHelper.getFoto(req.params.id);
        if (!foto) {
            return res.status(404).json({ error: 'Foto no encontrada' });
        }
        res.set('Content-Type', foto.tipo_mime);
        res.set('Cache-Control', 'public, max-age=86400'); // cache 1 día
        res.send(foto.archivo);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
