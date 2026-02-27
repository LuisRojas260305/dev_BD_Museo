const { pool } = require('../../config/database');

// Obtener todos los artistas
const getAllArtistas = async (req, res) => {
    try {
        // Ejecutar consulta SQL
        const [rows] = await pool.query('SELECT * FROM Artista');
        // Enviar respuesta
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Crear un nuevo artista
const createArtista = async (req, res) => {
    let connection;
    try {
        const { nombre, apellido, biografia, fecha_nacimiento, nacionalidad_id,
                foto_url, porcentaje_ganancia, comentario, generos } = req.body;

        // Validaciones básicas
        if (!nombre || !nacionalidad_id) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }

        // Verificar que nacionalidad exista
        const [nacionalidad] = await pool.query(
            'SELECT nacionalidad_id FROM Nacionalidad WHERE nacionalidad_id = ?',
            [nacionalidad_id]
        );
        if (nacionalidad.length === 0) {
            return res.status(400).json({ error: 'La nacionalidad no existe' });
        }

        // Obtener conexión para transacción
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Insertar artista
        const [result] = await connection.query(
            `INSERT INTO Artista 
             (nombre, apellido, biografia, fecha_nacimiento, nacionalidad_id, foto_url, porcentaje_ganancia, comentario) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [nombre, apellido || null, biografia || null, fecha_nacimiento || null,
             nacionalidad_id, foto_url || 'Frontend/images', porcentaje_ganancia || 5, comentario || null]
        );

        const artistaId = result.insertId;

        // Insertar géneros si se enviaron
        if (generos && Array.isArray(generos) && generos.length > 0) {
            // Verificar que los géneros existan (opcional, se puede hacer con una sola consulta)
            const placeholders = generos.map(() => '?').join(',');
            const [generosExistentes] = await connection.query(
                `SELECT genero_id FROM Genero WHERE genero_id IN (${placeholders})`,
                generos
            );
            if (generosExistentes.length !== generos.length) {
                throw new Error('Algunos géneros no existen');
            }

            // Insertar en Artista_Genero
            const values = generos.map(generoId => [artistaId, generoId, null]);
            await connection.query(
                'INSERT INTO Artista_Genero (artista_id, genero_id, comentario) VALUES ?',
                [values]
            );
        }

        await connection.commit();
        res.status(201).json({ id: artistaId, message: 'Artista creado con géneros' });

    } catch (error) {
        if (connection) await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    getAllArtistas,
    createArtista
};