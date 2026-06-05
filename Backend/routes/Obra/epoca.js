const express = require('express');
const router = express.Router();
const epocaController = require('../../controllers/Obra/epocaController');
const { verificarToken, verificarAdmin } = require('../../shared/auth');

router.get('/', epocaController.getAll);
router.post('/', verificarToken, verificarAdmin, epocaController.create);
router.put('/:id', verificarToken, verificarAdmin, epocaController.update);
router.delete('/:id', verificarToken, verificarAdmin, epocaController.delete);

module.exports = router;