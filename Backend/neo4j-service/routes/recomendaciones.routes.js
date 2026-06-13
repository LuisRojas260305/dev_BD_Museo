/**
 * Rutas del microservicio de recomendaciones (Neo4j).
 * - GET  /health                       → estado del servicio (público)
 * - GET  /populares                    → obras más compradas (público)
 * - POST /compras                      → registro de compra desde el core (token/internal)
 * - GET  /:usuarioId                   → recomendaciones combinadas (público)
 * - GET  /:usuarioId/genero|artista    → recomendaciones por estrategia
 */
const router = require('express').Router();
const ctrl = require('../controllers/recomendacion.controller');
const { verificarToken } = require('../middleware/auth');

router.get('/health', ctrl.healthCheck);
router.get('/populares', ctrl.populares);
router.post('/nl', ctrl.lenguajeNatural);
router.post('/compras', verificarToken, ctrl.registrarCompra);
router.get('/:usuarioId', ctrl.recomendarUsuario);
router.get('/:usuarioId/genero', ctrl.porGenero);
router.get('/:usuarioId/artista', ctrl.porArtista);

module.exports = router;
