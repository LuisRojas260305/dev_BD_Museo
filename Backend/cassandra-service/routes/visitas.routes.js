const router = require('express').Router();
const { registrarVisita, obtenerVisitasObra, topObras } = require('../models/visitas');

// POST /api/visitas/:obra_id - registrar una visita
router.post('/:obra_id', async (req, res) => {
    try {
        await registrarVisita(req.params.obra_id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/visitas/top - top obras más visitadas
router.get('/top', async (req, res) => {
    try {
        const limite = parseInt(req.query.limite) || 10;
        res.json({ obras: await topObras(limite) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/visitas/:obra_id - total y desglose diario de una obra
router.get('/:obra_id', async (req, res) => {
    try {
        res.json(await obtenerVisitasObra(req.params.obra_id));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
