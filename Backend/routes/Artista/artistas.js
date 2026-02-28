const express = require('express');
const router = express.Router();
const artistaController = require('../../controllers/Artista/artistasController');

// Definir rutas
router.get('/', artistaController.getAllArtistas);
router.post('/', artistaController.createArtista);
router.put('/:id', artistaController.updateArtista);
router.delete('/:id', artistaController.deleteArtista);

module.exports = router;