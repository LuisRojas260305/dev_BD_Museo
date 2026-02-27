const { pool } = require('../../config/database');

// Obtener todas las Generoes
const getAllGeneros = async (req, res) => {
    try {
        // Ejecutar consulta SQL
        const [rows] = await pool.query('SELECT * FROM Genero');
        // Enviar respuesta
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Crear una nueva Genero
const createGenero = async (req, res) => {
    try {
        // Obtener datos del cuerpo de la peticion
        const { nombre, descripcion, comentario } = req.body;

        // Verificar datos nulos
        if (!nombre || nombre.trim() === ''){
            return res.status(400).json({ error: 'Falta campo obligatorio' });
        }

        // Limpia el nombre
        const nombrelimpio = nombre.trim();

        const [exist] = await pool.query(
            'SELECT Genero_id FROM Genero WHERE nombre = ?',
            [nombrelimpio]
        );

        if (exist.length > 0) {
            return res.status(409).json({ error: 'Ya existe una Genero con ese nombre' });
        };

        // Ejecutar consulta INSERT
        const [result] = await pool.query(
            'INSERT INTO Genero (nombre, descripcion, comentario) VALUES (?, ?, ?)',
            [nombre, descripcion || null, comentario || null]
        );

        // Responder con la ID del nuevo registro
        res.status(201).json({ id: result.insertId, message: 'Genero creado'});

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Modificar una Genero
const updateGenero = async (req, res) => {
    try {
        
        // Conseguir id
        const genero_id = req.params.id;
        
        // Verificar id
        const [existingRows] = await pool.query(
            'SELECT genero_id FROM Genero WHERE genero_id = ?',
            [genero_id]
        );

        if (existingRows.length === 0) {
            return res.status(404).json({ error: 'No existe un Genero con este id'});
        };

        // Modificar registro
        const { nombre, descripcion, comentario } = req.body;

        // Verificar datos nulos
        if (!nombre || nombre.trim() === ''){
            return res.status(400).json({ error: 'Falta campo obligatorio' });
        }

        // Limpia el nombre
        const nombrelimpio = nombre.trim();

        const [existingWithSameName] = await pool.query(
            'SELECT genero_id FROM Genero WHERE nombre = ? AND genero_id != ?',
            [nombrelimpio, genero_id]
        );

        if (existingWithSameName.length > 0) {
            return res.status(409).json({ error: 'Ya existe un Genero con ese nombre' });
        };

        // Ejecutar consulta UPDATE
        const [result] = await pool.query(
            'UPDATE Genero SET nombre = ?, descripcion = ?, comentario = ? WHERE genero_id = ?',
            [nombre, descripcion || null, comentario || null, genero_id]
        );

        // Responder queri
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'No se pudo actualizar, el Genero no existe' });
        }
        res.json({ message: 'Genero modificado', affectedRows: result.affectedRows });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Eliminar una Genero
const deleteGenero = async (req, res) => {
    try {
        // Conseguir id
        const genero_id = req.params.id;
        
        // Verificar id
        const [existingRows] = await pool.query(
            'SELECT genero_id FROM Genero WHERE genero_id = ?',
            [genero_id]
        );

        if (existingRows.length === 0) {
            return res.status(404).json({ error: 'No existe un Genero con este id'});
        };

        // Ejecutar consulta
        const [result] = await pool.query(
            'DELETE FROM Genero WHERE genero_id = ?',
            [genero_id]
        );

        res.json({ message: 'Genero eliminado', affectedRows: result.affectedRows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllGeneros,
    createGenero,
    updateGenero,
    deleteGenero
};