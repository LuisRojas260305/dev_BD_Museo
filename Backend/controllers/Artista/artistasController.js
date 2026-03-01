const { pool } = require('../../config/database');

// Obtener todos los artistas (con géneros en cadena separada por comas)
const getAllArtistas = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.*, n.nombre as nacionalidad_nombre,
             (SELECT GROUP_CONCAT(g.nombre) 
              FROM Artista_Genero ag 
              JOIN Genero g ON ag.genero_id = g.genero_id 
              WHERE ag.artista_id = a.artista_id) as generos
      FROM Artista a
      JOIN Nacionalidad n ON a.nacionalidad_id = n.nacionalidad_id
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener un artista por ID (con géneros en array)
const getArtistaById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
      SELECT a.*, n.nombre as nacionalidad_nombre
      FROM Artista a
      JOIN Nacionalidad n ON a.nacionalidad_id = n.nacionalidad_id
      WHERE a.artista_id = ?
    `, [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Artista no encontrado' });

    const artista = rows[0];

    // Obtener géneros del artista como array de objetos
    const [generos] = await pool.query(`
      SELECT g.genero_id, g.nombre
      FROM Artista_Genero ag
      JOIN Genero g ON ag.genero_id = g.genero_id
      WHERE ag.artista_id = ?
    `, [id]);

    artista.generos = generos; // array de objetos
    res.json(artista);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Crear un nuevo artista (con géneros)
const createArtista = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { nombre, apellido, biografia, fecha_nacimiento, nacionalidad_id,
            foto_url, porcentaje_ganancia, comentario, generos } = req.body;

    if (!nombre || !nacionalidad_id) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    // Insertar artista
    const [result] = await connection.query(
      `INSERT INTO Artista 
       (nombre, apellido, biografia, fecha_nacimiento, nacionalidad_id, foto_url, porcentaje_ganancia, comentario)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido || null, biografia || null, fecha_nacimiento || null,
       nacionalidad_id, foto_url || 'Frontend/images', porcentaje_ganancia || 5, comentario || null]
    );
    const artistaId = result.insertId;

    // Insertar géneros si se proporcionaron
    if (generos && Array.isArray(generos) && generos.length > 0) {
      for (const generoId of generos) {
        // Verificar que el género exista
        const [g] = await connection.query('SELECT genero_id FROM Genero WHERE genero_id = ?', [generoId]);
        if (g.length === 0) {
          throw new Error(`El género con ID ${generoId} no existe`);
        }
        await connection.query(
          'INSERT INTO Artista_Genero (artista_id, genero_id) VALUES (?, ?)',
          [artistaId, generoId]
        );
      }
    }

    await connection.commit();
    res.status(201).json({ id: artistaId, message: 'Artista creado' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

// Actualizar un artista (y sus géneros)
const updateArtista = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { nombre, apellido, biografia, fecha_nacimiento, nacionalidad_id,
            foto_url, porcentaje_ganancia, comentario, generos } = req.body;

    // Verificar existencia
    const [exist] = await connection.query('SELECT artista_id FROM Artista WHERE artista_id = ?', [id]);
    if (exist.length === 0) {
      return res.status(404).json({ error: 'Artista no encontrado' });
    }

    // Actualizar datos básicos
    await connection.query(
      `UPDATE Artista SET 
        nombre = ?, apellido = ?, biografia = ?, fecha_nacimiento = ?, nacionalidad_id = ?,
        foto_url = ?, porcentaje_ganancia = ?, comentario = ?
       WHERE artista_id = ?`,
      [nombre, apellido, biografia, fecha_nacimiento, nacionalidad_id,
       foto_url, porcentaje_ganancia, comentario, id]
    );

    // Actualizar géneros: eliminar los actuales e insertar los nuevos
    if (generos !== undefined) {
      // Eliminar relaciones existentes
      await connection.query('DELETE FROM Artista_Genero WHERE artista_id = ?', [id]);

      // Insertar nuevos géneros
      if (Array.isArray(generos) && generos.length > 0) {
        for (const generoId of generos) {
          const [g] = await connection.query('SELECT genero_id FROM Genero WHERE genero_id = ?', [generoId]);
          if (g.length === 0) {
            throw new Error(`El género con ID ${generoId} no existe`);
          }
          await connection.query(
            'INSERT INTO Artista_Genero (artista_id, genero_id) VALUES (?, ?)',
            [id, generoId]
          );
        }
      }
    }

    await connection.commit();
    res.json({ message: 'Artista actualizado' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

// Eliminar un artista (solo admin)
const deleteArtista = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM Artista WHERE artista_id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Artista no encontrado' });
    }
    res.json({ message: 'Artista eliminado' });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ error: 'No se puede eliminar porque tiene obras asociadas' });
    }
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllArtistas,
  getArtistaById,
  createArtista,
  updateArtista,
  deleteArtista
};