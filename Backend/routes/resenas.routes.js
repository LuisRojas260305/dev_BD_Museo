const router = require('express').Router();
const { pool } = require('../config/database');
const { verificarToken } = require('../shared/auth');

// GET /api/resenas/:obra_id - reseñas públicas de una obra con promedio
router.get('/:obra_id', async (req, res) => {
    const { obra_id } = req.params;
    try {
        const [rows] = await pool.query(
            `SELECT r.resena_id, r.rating, r.comentario, r.fecha,
                    u.nombre, u.apellido
             FROM Resena r
             JOIN Usuario u ON r.usuario_id = u.usuario_id
             WHERE r.obra_id = ?
             ORDER BY r.fecha DESC`,
            [obra_id]
        );
        const [avg] = await pool.query(
            'SELECT ROUND(AVG(rating), 1) as promedio, COUNT(*) as total FROM Resena WHERE obra_id = ?',
            [obra_id]
        );
        res.json({ promedio: avg[0].promedio || 0, total: avg[0].total, resenas: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/resenas - crear o actualizar reseña propia (requiere login)
router.post('/', verificarToken, async (req, res) => {
    const { obra_id, rating, comentario } = req.body;
    const usuario_id = req.usuario.usuario_id || req.usuario.id;

    if (!obra_id || !rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'obra_id y rating (1-5) son requeridos.' });
    }
    try {
        await pool.query(
            `INSERT INTO Resena (obra_id, usuario_id, rating, comentario)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE rating = VALUES(rating), comentario = VALUES(comentario), fecha = NOW()`,
            [obra_id, usuario_id, rating, comentario || null]
        );
        res.json({ success: true, message: 'Reseña guardada.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/resenas/:obra_id - eliminar propia reseña
router.delete('/:obra_id', verificarToken, async (req, res) => {
    const { obra_id } = req.params;
    const usuario_id = req.usuario.usuario_id || req.usuario.id;
    try {
        await pool.query('DELETE FROM Resena WHERE obra_id = ? AND usuario_id = ?', [obra_id, usuario_id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
