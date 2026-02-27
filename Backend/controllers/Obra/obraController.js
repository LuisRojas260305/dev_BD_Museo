const { pool } = require('../../config/database');
const {
  insertPintura, insertEscultura, insertFotografia,
  insertCeramica, insertOrfebreria
} = require('../../services/obraServices');

// Obtener todas las obras (con filtros opcionales)
const getAllObras = async (req, res) => {
  try {
    let query = `
      SELECT o.*, a.nombre as artista_nombre, g.nombre as genero_nombre, e.nombre as epoca_nombre
      FROM Obra o
      JOIN Artista a ON o.artista_id = a.artista_id
      JOIN Genero g ON o.genero_id = g.genero_id
      JOIN Epoca e ON o.epoca_id = e.epoca_id
    `;
    const params = [];

    // Filtros opcionales
    const { genero_id, artista_id, orden } = req.query;
    if (genero_id) {
      query += ' WHERE o.genero_id = ?';
      params.push(genero_id);
    }
    if (artista_id) {
      query += params.length ? ' AND' : ' WHERE';
      query += ' o.artista_id = ?';
      params.push(artista_id);
    }

    if (orden === 'precio') {
      query += ' ORDER BY o.precio_venta ASC';
    }

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener una obra por ID (con detalles específicos según género)
const getObraById = async (req, res) => {
  try {
    const { id } = req.params;
    // Primero obtenemos la obra base
    const [obra] = await pool.query(`
      SELECT o.*, a.nombre as artista_nombre, g.nombre as genero_nombre, e.nombre as epoca_nombre
      FROM Obra o
      JOIN Artista a ON o.artista_id = a.artista_id
      JOIN Genero g ON o.genero_id = g.genero_id
      JOIN Epoca e ON o.epoca_id = e.epoca_id
      WHERE o.obra_id = ?
    `, [id]);

    if (obra.length === 0) return res.status(404).json({ error: 'Obra no encontrada' });

    const result = obra[0];

    // Según el género, traer datos adicionales
    switch (result.genero_id) {
      case 1: // Pintura
        const [pintura] = await pool.query(`
          SELECT p.*, s.nombre as soporte_nombre,
                 (SELECT GROUP_CONCAT(e.nombre) FROM Pintura_Estilo pe JOIN Estilo e ON pe.estilo_id = e.estilo_id WHERE pe.obra_id = ?) as estilos,
                 (SELECT GROUP_CONCAT(t.nombre) FROM Pintura_Tematica pt JOIN Tematica t ON pt.tematica_id = t.tematica_id WHERE pt.obra_id = ?) as tematicas
          FROM Pintura p
          JOIN Soporte s ON p.soporte_id = s.soporte_id
          WHERE p.obra_id = ?
        `, [id, id, id]);
        if (pintura.length > 0) {
          result.detalles = pintura[0];
        }
        break;
      case 2: // Escultura
        const [escultura] = await pool.query(`
          SELECT e.*, t.nombre as tipo_nombre,
                 (SELECT GROUP_CONCAT(m.nombre) FROM Escultura_Material em JOIN Material m ON em.material_id = m.material_id WHERE em.obra_id = ?) as materiales,
                 (SELECT GROUP_CONCAT(tec.nombre) FROM Escultura_Tecnica et JOIN Tecnica_Escultura tec ON et.tecnica_id = tec.tecnica_id WHERE et.obra_id = ?) as tecnicas
          FROM Escultura e
          JOIN Tipo_Escultura t ON e.tipo_id = t.tipo_id
          WHERE e.obra_id = ?
        `, [id, id, id]);
        if (escultura.length > 0) {
          result.detalles = escultura[0];
        }
        break;
      case 3: // Fotografia
        const [foto] = await pool.query(`
          SELECT f.*, i.nombre as impresion_nombre, c.nombre as camara_nombre, tf.nombre as tecnica_nombre
          FROM Fotografia f
          JOIN Impresion i ON f.impresion_id = i.impresion_id
          JOIN Camara c ON f.camara_id = c.camara_id
          JOIN Tecnica_Fotografica tf ON f.tecnica_id = tf.tecnica_id
          WHERE f.obra_id = ?
        `, [id]);
        if (foto.length > 0) {
          result.detalles = foto[0];
        }
        break;
      case 4: // Ceramica
        const [ceramica] = await pool.query(`
          SELECT c.*, co.nombre as coccion_nombre, a.nombre as arcilla_nombre,
                 m.nombre as modelado_nombre, e.nombre as esmaltado_nombre
          FROM Ceramica c
          JOIN Coccion co ON c.coccion_id = co.coccion_id
          JOIN Arcilla a ON c.arcilla_id = a.arcilla_id
          JOIN Modelado m ON c.modelado_id = m.modelado_id
          JOIN Esmaltado e ON c.esmaltado_id = e.esmaltado_id
          WHERE c.obra_id = ?
        `, [id]);
        if (ceramica.length > 0) {
          result.detalles = ceramica[0];
        }
        break;
      case 5: // Orfebreria
        const [orfebreria] = await pool.query(`
          SELECT o.*, p.nombre as pieza_nombre, m.nombre as metal_predominante_nombre,
                 (SELECT GROUP_CONCAT(me.nombre) FROM Orfebreria_Metales om JOIN Metales me ON om.metal_id = me.metal_id WHERE om.obra_id = ?) as otros_metales
          FROM Orfebreria o
          JOIN Pieza_Orfebreria p ON o.pieza_id = p.pieza_id
          JOIN Metales m ON o.metal_predominante_id = m.metal_id
          WHERE o.obra_id = ?
        `, [id, id]);
        if (orfebreria.length > 0) {
          result.detalles = orfebreria[0];
        }
        break;
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Crear una nueva obra (con datos específicos según género)
const createObra = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Datos comunes
    const { nombre, codigo_inventario, artista_id, genero_id, epoca_id,
            precio_venta, alto, ancho, fecha_creacion, estado,
            foto_url, descripcion, comentario } = req.body;

    if (!codigo_inventario || !artista_id || !genero_id || !epoca_id || !precio_venta) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    // Insertar en Obra
    const [result] = await connection.query(
      `INSERT INTO Obra 
       (nombre, codigo_inventario, artista_id, genero_id, epoca_id, precio_venta,
        alto, ancho, fecha_creacion, estado, foto_url, descripcion, comentario)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre || 'Sin Titulo', codigo_inventario, artista_id, genero_id, epoca_id,
       precio_venta, alto || 0, ancho || 0, fecha_creacion, estado || 'Disponible',
       foto_url || 'Frontend/images', descripcion || null, comentario || null]
    );
    const obraId = result.insertId;

    // Insertar datos específicos según género
    switch (genero_id) {
      case 1:
        await insertPintura(connection, obraId, req.body);
        break;
      case 2:
        await insertEscultura(connection, obraId, req.body);
        break;
      case 3:
        await insertFotografia(connection, obraId, req.body);
        break;
      case 4:
        await insertCeramica(connection, obraId, req.body);
        break;
      case 5:
        await insertOrfebreria(connection, obraId, req.body);
        break;
      default:
        throw new Error('Género no válido');
    }

    await connection.commit();
    res.status(201).json({ id: obraId, message: 'Obra creada correctamente' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

// Actualizar una obra (complejo, podría omitirse o hacerse solo para datos básicos)
// Por simplicidad, no implementaremos update completo de obras con todas sus relaciones.
// Se puede hacer un endpoint que actualice solo los campos básicos de Obra.

// Eliminar una obra (solo admin)
const deleteObra = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM Obra WHERE obra_id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Obra no encontrada' });
    }
    res.json({ message: 'Obra eliminada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllObras,
  getObraById,
  createObra,
  deleteObra
};