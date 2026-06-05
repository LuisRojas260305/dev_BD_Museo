const express = require('express');
const router = express.Router();
const generoController = require('../../controllers/Obra/generoController');
const { verificarToken, verificarAdmin } = require('../../shared/auth');

// Definir rutas
router.get('/', generoController.getAllGeneros);
router.get('/:id', generoController.getGeneroById);  // <-- NUEVA RUTA
router.post('/', verificarToken, verificarAdmin, generoController.createGenero);
router.put('/:id', verificarToken, verificarAdmin, generoController.updateGenero);
router.delete('/:id', verificarToken, verificarAdmin, generoController.deleteGenero);

module.exports = router;