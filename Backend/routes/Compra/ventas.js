const express = require('express');
const router = express.Router();
const ventaController = require('../../controllers/Compra/ventaController');
const { verificarToken, verificarMiembro, verificarAdmin } = require('../../middlewares/auth');

router.post('/reservar', verificarToken, verificarMiembro, ventaController.reservarObra);
router.put('/:id/concretar', verificarToken, verificarAdmin, ventaController.concretarVenta);
router.put('/:id/cancelar', verificarToken, verificarAdmin, ventaController.cancelarVenta);

module.exports = router;