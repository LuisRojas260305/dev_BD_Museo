const express = require('express');
const router = express.Router();
const controller = require('../../controllers/Pintura/soporteController');
const { verificarToken, verificarAdmin } = require('../../shared/authMiddleware');

router.get('/', controller.getAll);
router.post('/', verificarToken, verificarAdmin, controller.create);
router.put('/:id', verificarToken, verificarAdmin, controller.update);
router.delete('/:id', verificarToken, verificarAdmin, controller.delete);

module.exports = router;
