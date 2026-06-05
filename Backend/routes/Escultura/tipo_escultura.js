const express = require('express');
const router = express.Router();
const controller = require('../../controllers/Escultura/tipo_esculturaController');
const { verificarToken, verificarAdmin } = require('../../shared/auth');

router.get('/', controller.getAll);
router.post('/', verificarToken, verificarAdmin, controller.create);
router.put('/:id', verificarToken, verificarAdmin, controller.update);
router.delete('/:id', verificarToken, verificarAdmin, controller.delete);

module.exports = router;
