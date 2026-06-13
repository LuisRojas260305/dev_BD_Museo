const router = require('express').Router();
const axios = require('axios');

const CASSANDRA_BASE = process.env.CASSANDRA_URL
    ? process.env.CASSANDRA_URL.replace('/api/auditoria', '')
    : 'http://localhost:3002';

const cassandra = axios.create({ baseURL: CASSANDRA_BASE, timeout: 5000 });

// POST /api/visitas/:obra_id - registrar visita (público, sin auth)
router.post('/:obra_id', async (req, res) => {
    try {
        const { data } = await cassandra.post(`/api/visitas/${req.params.obra_id}`);
        res.json(data);
    } catch {
        res.json({ success: false });
    }
});

// GET /api/visitas/top - top obras (público)
router.get('/top', async (req, res) => {
    try {
        const { data } = await cassandra.get('/api/visitas/top', { params: req.query });
        res.json(data);
    } catch (err) {
        res.status(503).json({ error: 'Servicio de visitas no disponible' });
    }
});

// GET /api/visitas/:obra_id - total de una obra (público)
router.get('/:obra_id', async (req, res) => {
    try {
        const { data } = await cassandra.get(`/api/visitas/${req.params.obra_id}`);
        res.json(data);
    } catch (err) {
        res.status(503).json({ error: 'Servicio de visitas no disponible' });
    }
});

module.exports = router;
