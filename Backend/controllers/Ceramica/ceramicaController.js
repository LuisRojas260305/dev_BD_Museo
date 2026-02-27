const { pool } = require('../../config/database');

// Obtener todas las ceramica
const getAllCeramicas = async (req, res) => {
    try {
        // Ejecutar consulta SQL
        const [rows] = await pool.query('SELECT * FROM Ceramica');
        // Enviar respuesta
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Crear una nueva ceramica
const createCeramica = async (req, res) => {
    try {
        // Obtener datos del cuerpo de la peticion
        const { nombre, comentario } = req.body;

        // Verificar datos nulos
        if (!nombre || nombre.trim() === ''){
            return res.status(400).json({ error: 'Falta campo obligatorio' });
        }

        // Limpia el nombre
        const nombrelimpio = nombre.trim();

        const [exist] = await pool.query(
            'SELECT ceramica_id FROM Ceramica WHERE nombre = ?',
            [nombrelimpio]
        );

        if (exist.length > 0) {
            return res.status(409).json({ error: 'Ya existe una ceramica con ese nombre' });
        };

        // Ejecutar consulta INSERT
        const [result] = await pool.query(
            'INSERT INTO Ceramica (nombre, comentario) VALUES (?, ?)',
            [nombre, comentario || null]
        );

        // Responder con la ID del nuevo registro
        res.status(201).json({ id: result.insertId, message: 'Ceramica creada'});

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Modificar una ceramica
const updateCeramica = async (req, res) => {
    try {
        
        // Conseguir id
        const ceramica_id = req.params.id;
        
        // Verificar id
        const [existingRows] = await pool.query(
            'SELECT ceramica_id FROM Ceramica WHERE ceramica_id = ?',
            [ceramica_id]
        );

        if (existingRows.length === 0) {
            return res.status(404).json({ error: 'No existe una ceramica con este id'});
        };

        // Modificar registro
        const { nombre, comentario } = req.body;

        // Verificar datos nulos
        if (!nombre || nombre.trim() === ''){
            return res.status(400).json({ error: 'Falta campo obligatorio' });
        }

        // Limpia el nombre
        const nombrelimpio = nombre.trim();

        const [existingWithSameName] = await pool.query(
            'SELECT ceramica_id FROM Ceramica WHERE nombre = ? AND ceramica_id != ?',
            [nombrelimpio, ceramica_id]
        );

        if (existingWithSameName.length > 0) {
            return res.status(409).json({ error: 'Ya existe una ceramica con ese nombre' });
        };

        // Ejecutar consulta UPDATE
        const [result] = await pool.query(
            'UPDATE Ceramica SET nombre = ?, comentario = ? WHERE ceramica_id = ?',
            [nombre, comentario || null, ceramica_id]
        );

        // Responder queri
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'No se pudo actualizar, la ceramica no existe' });
        }
        res.json({ message: 'Ceramica modificada', affectedRows: result.affectedRows });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Eliminar una ceramica
const deleteCeramica = async (req, res) => {
    try {
        // Conseguir id
        const ceramica_id = req.params.id;
        
        // Verificar id
        const [existingRows] = await pool.query(
            'SELECT ceramica_id FROM Ceramica WHERE ceramica_id = ?',
            [ceramica_id]
        );

        if (existingRows.length === 0) {
            return res.status(404).json({ error: 'No existe una ceramica con este id'});
        };

        // Ejecutar consulta
        const [result] = await pool.query(
            'DELETE FROM Ceramica WHERE ceramica_id = ?',
            [ceramica_id]
        );

        res.json({ message: 'Ceramica eliminada', affectedRows: result.affectedRows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllCeramicas,
    createCeramica,
    updateCeramica,
    deleteCeramica
};