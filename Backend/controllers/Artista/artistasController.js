const { pool } = require('../../config/database');

// Obtener todos los artistas (con géneros incluidos, sin la foto)
const getAllArtistas = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.artista_id, a.nombre, a.apellido, a.biografia, a.fecha_nacimiento,
             a.nacionalidad_id, n.nombre as nacionalidad_nombre,
             a.porcentaje_ganancia, a.comentario,
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

// Obtener un artista por ID (sin la foto)
const getArtistaById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
      SELECT a.artista_id, a.nombre, a.apellido, a.biografia, a.fecha_nacimiento,
             a.nacionalidad_id, n.nombre as nacionalidad_nombre,
             a.porcentaje_ganancia, a.comentario
      FROM Artista a
      JOIN Nacionalidad n ON a.nacionalidad_id = n.nacionalidad_id
      WHERE a.artista_id = ?
    `, [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Artista no encontrado' });

    const artista = rows[0];

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

// Obtener la foto de un artista (binario)
const getArtistaFoto = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT foto FROM Artista WHERE artista_id = ?', [id]);
    if (rows.length === 0 || !rows[0].foto) {
      return res.status(404).send('Foto no encontrada');
    }
    const foto = rows[0].foto;
    // Por defecto asumimos image/jpeg. Si quieres guardar el mimetype, puedes añadir una columna.
    res.set('Content-Type', 'image/jpeg');
    res.send(foto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Crear un nuevo artista (con géneros y foto)
const createArtista = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { nombre, apellido, biografia, fecha_nacimiento, nacionalidad_id,
            porcentaje_ganancia, comentario, generos } = req.body;
    const foto = req.file ? req.file.buffer : null;

    if (!nombre || !nacionalidad_id) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    // Parsear generos si viene como string JSON (desde FormData)
    let generosArray = [];
    if (generos) {
      try {
        generosArray = JSON.parse(generos);
      } catch (e) {
        // Si ya es un array (en peticiones JSON normales)
        generosArray = Array.isArray(generos) ? generos : [];
      }
    }

    // Insertar artista
    const [result] = await connection.query(
      `INSERT INTO Artista 
       (nombre, apellido, biografia, fecha_nacimiento, nacionalidad_id, foto, porcentaje_ganancia, comentario)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido || null, biografia || null, fecha_nacimiento || null,
       nacionalidad_id, foto, porcentaje_ganancia || 5, comentario || null]
    );
    const artistaId = result.insertId;

    // Insertar géneros si se proporcionaron
    if (generosArray.length > 0) {
      for (const generoId of generosArray) {
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

// Actualizar un artista (y sus géneros, y foto)
const updateArtista = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { nombre, apellido, biografia, fecha_nacimiento, nacionalidad_id,
            porcentaje_ganancia, comentario, generos } = req.body;
    const foto = req.file ? req.file.buffer : undefined;

    // Verificar existencia
    const [exist] = await connection.query('SELECT artista_id FROM Artista WHERE artista_id = ?', [id]);
    if (exist.length === 0) {
      return res.status(404).json({ error: 'Artista no encontrado' });
    }

    // Parsear generos si viene como string JSON
    let generosArray = [];
    if (generos !== undefined) {
      try {
        generosArray = JSON.parse(generos);
      } catch (e) {
        generosArray = Array.isArray(generos) ? generos : [];
      }
    }

    // Construir la consulta de actualización dinámicamente
    let updateQuery = 'UPDATE Artista SET nombre = ?, apellido = ?, biografia = ?, fecha_nacimiento = ?, nacionalidad_id = ?, porcentaje_ganancia = ?, comentario = ?';
    const params = [nombre, apellido, biografia, fecha_nacimiento, nacionalidad_id, porcentaje_ganancia, comentario];

    if (foto !== undefined) {
      updateQuery += ', foto = ?';
      params.push(foto);
    }
    updateQuery += ' WHERE artista_id = ?';
    params.push(id);

    await connection.query(updateQuery, params);

    // Actualizar géneros: eliminar los actuales e insertar los nuevos
    if (generos !== undefined) {
      await connection.query('DELETE FROM Artista_Genero WHERE artista_id = ?', [id]);
      if (generosArray.length > 0) {
        for (const generoId of generosArray) {
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
  getArtistaFoto,
  createArtista,
  updateArtista,
  deleteArtista
};