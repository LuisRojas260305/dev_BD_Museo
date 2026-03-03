const { pool } = require('../../config/database');

// Obtener todos los géneros
const getAllGeneros = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Genero');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener un género por ID
const getGeneroById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM Genero WHERE genero_id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Género no encontrado' });
        }
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Crear un nuevo género
const createGenero = async (req, res) => {
    try {
        const { nombre, descripcion, comentario } = req.body;

        if (!nombre || nombre.trim() === '') {
            return res.status(400).json({ error: 'Falta campo obligatorio' });
        }

        const nombrelimpio = nombre.trim();

        const [exist] = await pool.query(
            'SELECT genero_id FROM Genero WHERE nombre = ?',
            [nombrelimpio]
        );

        if (exist.length > 0) {
            return res.status(409).json({ error: 'Ya existe un género con ese nombre' });
        }

        const [result] = await pool.query(
            'INSERT INTO Genero (nombre, descripcion, comentario) VALUES (?, ?, ?)',
            [nombre, descripcion || null, comentario || null]
        );

        res.status(201).json({ id: result.insertId, message: 'Género creado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Modificar un género
const updateGenero = async (req, res) => {
    try {
        const genero_id = req.params.id;

        const [existingRows] = await pool.query(
            'SELECT genero_id FROM Genero WHERE genero_id = ?',
            [genero_id]
        );

        if (existingRows.length === 0) {
            return res.status(404).json({ error: 'No existe un género con este id' });
        }

        const { nombre, descripcion, comentario } = req.body;

        if (!nombre || nombre.trim() === '') {
            return res.status(400).json({ error: 'Falta campo obligatorio' });
        }

        const nombrelimpio = nombre.trim();

        const [existingWithSameName] = await pool.query(
            'SELECT genero_id FROM Genero WHERE nombre = ? AND genero_id != ?',
            [nombrelimpio, genero_id]
        );

        if (existingWithSameName.length > 0) {
            return res.status(409).json({ error: 'Ya existe un género con ese nombre' });
        }

        const [result] = await pool.query(
            'UPDATE Genero SET nombre = ?, descripcion = ?, comentario = ? WHERE genero_id = ?',
            [nombre, descripcion || null, comentario || null, genero_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'No se pudo actualizar, el género no existe' });
        }
        res.json({ message: 'Género modificado', affectedRows: result.affectedRows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Eliminar un género
const deleteGenero = async (req, res) => {
    try {
        const genero_id = req.params.id;

        const [existingRows] = await pool.query(
            'SELECT genero_id FROM Genero WHERE genero_id = ?',
            [genero_id]
        );

        if (existingRows.length === 0) {
            return res.status(404).json({ error: 'No existe un género con este id' });
        }

        const [result] = await pool.query('DELETE FROM Genero WHERE genero_id = ?', [genero_id]);

        res.json({ message: 'Género eliminado', affectedRows: result.affectedRows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllGeneros,
    getGeneroById,
    createGenero,
    updateGenero,
    deleteGenero
};