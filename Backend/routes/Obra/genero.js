const express = require('express');
const router = express.Router();
const generoController = require('../../controllers/Obra/generoController');

// Definir rutas
router.get('/', generoController.getAllGeneros);
router.get('/:id', generoController.getGeneroById);  // <-- NUEVA RUTA
router.post('/', generoController.createGenero);
router.put('/:id', generoController.updateGenero);
router.delete('/:id', generoController.deleteGenero);

module.exports = router;