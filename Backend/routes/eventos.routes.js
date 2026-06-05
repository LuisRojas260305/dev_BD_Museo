// /api/eventos — Proxy a cassandra-service
const router = require('express').Router();
const eventosProxy = require('../services/eventosProxy');
const { verificarToken, verificarAdmin } = require('../shared/auth');

// GET /api/eventos — Listar eventos de auditoría (admin only)
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

// GET /api/eventos/reportes — Reportes de auditoría (admin only)
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
