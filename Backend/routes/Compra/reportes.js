const express = require('express');
const router = express.Router();
const reportesController = require('../../controllers/Compra/reportesController');
const { verificarToken, verificarAdmin } = require('../../middlewares/auth');

router.get('/ventas', verificarToken, verificarAdmin, reportesController.obrasVendidasPorPeriodo);
router.get('/facturacion', verificarToken, verificarAdmin, reportesController.resumenFacturacion);
router.get('/membresias', verificarToken, verificarAdmin, reportesController.resumenMembresias);

module.exports = router;