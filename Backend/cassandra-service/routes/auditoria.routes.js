const router = require('express').Router();
const ctrl = require('../controllers/auditoria.controller');
const { verificarToken, verificarAdmin } = require('../middleware/authMiddleware');

router.post('/eventos',    verificarToken,  ctrl.createEvent);
router.get('/eventos',     verificarToken, verificarAdmin, ctrl.getEvents);
router.get('/reportes',    verificarToken, verificarAdmin, ctrl.getReports);
router.get('/health',      ctrl.healthCheck);

module.exports = router;
