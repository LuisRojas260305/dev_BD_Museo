const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const artistaController = require('../../controllers/Artista/artistasController');

// Definir rutas
router.get('/', artistaController.getAllArtistas);
router.get('/:id', artistaController.getArtistaById);
router.get('/:id/foto', artistaController.getArtistaFoto); // nueva ruta para la foto
router.post('/', upload.single('foto'), artistaController.createArtista);
router.put('/:id', upload.single('foto'), artistaController.updateArtista);
router.delete('/:id', artistaController.deleteArtista);

module.exports = router;