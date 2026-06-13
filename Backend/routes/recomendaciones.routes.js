/**
 * Rutas de recomendaciones del core - proxy hacia neo4j-service.
 * Expone al frontend las recomendaciones del grafo de conocimiento.
 *
 * @module routes/recomendaciones
 */
const router = require('express').Router();
const recomendacionHelper = require('../services/recomendacionHelper');
const { opcionalAuth } = require('../shared/auth');

const NEO4J_DOWN = {
    success: false,
    error: 'Recomendaciones no disponibles',
    details: 'El servicio de recomendaciones (Neo4j) no está disponible',
};

/**
 * POST /api/recomendaciones/nl
 * Reto +5%: traduce una pregunta en lenguaje natural a Cypher y la ejecuta.
 * Debe declararse antes de '/:usuarioId' para no ser capturada como parámetro.
 * @body {string} pregunta
 * @body {number} [usuario_id]
 */
router.post('/nl', opcionalAuth, async (req, res, next) => {
    try {
        const usuarioId = req.body.usuario_id || req.usuario?.usuario_id;
        const data = await recomendacionHelper.preguntarLenguajeNatural(req.body.pregunta, usuarioId);
        res.json(data);
    } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ECONNABORTED') {
            return res.status(503).json(NEO4J_DOWN);
        }
        next(err);
    }
});

/**
 * GET /api/recomendaciones/:usuarioId
 * Recomendaciones para un usuario (proxied a Neo4j).
 * @query {string} [estrategia=genero] - genero | artista | colaborativo
 * @query {number} [limite=10]
 */
router.get('/:usuarioId', opcionalAuth, async (req, res, next) => {
    try {
        const data = await recomendacionHelper.obtenerRecomendaciones(req.params.usuarioId, {
            estrategia: req.query.estrategia,
            limite: req.query.limite,
        });
        res.json(data);
    } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ECONNABORTED') {
            return res.status(503).json(NEO4J_DOWN);
        }
        next(err);
    }
});

module.exports = router;
