const express = require('express');
const router = express.Router();
const ventaController = require('../../controllers/Compra/ventaController');
const { verificarToken, verificarMiembro, verificarAdmin } = require('../../middlewares/auth');

router.post('/reservar', verificarToken, verificarMiembro, ventaController.reservarObra);
router.put('/:id/concretar', verificarToken, verificarAdmin, ventaController.concretarVenta);
router.put('/:id/cancelar', verificarToken, verificarAdmin, ventaController.cancelarVenta);
router.get('/', verificarToken, verificarAdmin, ventaController.getVentas);

// Rutas para facturas
router.get('/facturas', verificarToken, verificarAdmin, ventaController.getFacturas);
router.get('/facturas/:id', verificarToken, verificarAdmin, ventaController.getFacturaById);

module.exports = router;