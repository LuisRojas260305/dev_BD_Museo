/**
 * Routes for audit event operations.
 *
 * Proxies audit event requests to the cassandra-service.
 * All routes require JWT authentication + admin role.
 *
 * @module routes/eventos
 */

const router = require('express').Router();
const eventosProxy = require('../services/eventosProxy');
const { verificarToken, verificarAdmin } = require('../shared/auth');

/**
 * GET /api/eventos
 * List audit events (admin only).
 * @route GET /api/eventos
 * @auth Requires JWT + admin role
 * @query {Object} req.query - Query parameters forwarded to the events service
 * @returns {Object} 200 - Audit events list
 * @returns {Object} 503 - Audit service unavailable
 */
router.get('/', verificarToken, verificarAdmin, async (req, res, next) => {
    try {
        const data = await eventosProxy.getEventos(req.query);
        res.json(data);
    } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ECONNABORTED') {
            return res.status(503).json({
                success: false,
                error: 'Servicio de auditoría no disponible',
            });
        }
        next(err);
    }
});

/**
 * GET /api/eventos/reportes
 * Get audit reports (admin only).
 * @route GET /api/eventos/reportes
 * @auth Requires JWT + admin role
 * @query {Object} req.query - Query parameters forwarded to the events service
 * @returns {Object} 200 - Audit reports
 * @returns {Object} 503 - Audit service unavailable
 */
router.get('/reportes', verificarToken, verificarAdmin, async (req, res, next) => {
    try {
        const data = await eventosProxy.getReportes(req.query);
        res.json(data);
    } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ECONNABORTED') {
            return res.status(503).json({
                success: false,
                error: 'Servicio de auditoría no disponible',
            });
        }
        next(err);
    }
});

module.exports = router;
