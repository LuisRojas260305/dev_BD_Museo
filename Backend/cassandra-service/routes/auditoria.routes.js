/**
 * Rutas del microservicio de auditoría.
 * - POST /eventos   → registro de evento (requiere token)
 * - GET  /eventos   → consulta de eventos (requiere token + admin)
 * - GET  /reportes  → resúmenes diarios (requiere token + admin)
 * - GET  /health    → health check público
 */
const router = require('express').Router();
const ctrl = require('../controllers/auditoria.controller');
const { verificarToken, verificarAdmin } = require('../middleware/auth');

router.post('/eventos',    verificarToken,  ctrl.createEvent);
router.get('/eventos',     verificarToken, verificarAdmin, ctrl.getEvents);
router.get('/reportes',    verificarToken, verificarAdmin, ctrl.getReports);
router.get('/health',      ctrl.healthCheck);

module.exports = router;
