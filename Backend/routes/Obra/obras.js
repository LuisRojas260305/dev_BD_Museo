const express = require('express');
const router = express.Router();
const obraController = require('../../controllers/Obra/obraController');
const { verificarToken, verificarAdmin } = require('../../middlewares/auth');

// Rutas públicas
router.get('/', obraController.getAllObras);
router.get('/:id', obraController.getObraById);

// Rutas protegidas (solo admin)
router.post('/', verificarToken, verificarAdmin, obraController.createObra);
router.delete('/:id', verificarToken, verificarAdmin, obraController.deleteObra);

module.exports = router;