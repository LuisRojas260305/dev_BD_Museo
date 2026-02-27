const { pool } = require('../config/database');

const createGenericController = (tableName, options = {}) => {
  const { idField = `${tableName}_id`, nameField = 'nombre', uniqueName = true } = options;

  return {
    getAll: async (req, res) => {
      try {
        const [rows] = await pool.query(`SELECT * FROM ${tableName}`);
        res.json(rows);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    },

    create: async (req, res) => {
      try {
        const { nombre, comentario } = req.body;
        if (!nombre || nombre.trim() === '') {
          return res.status(400).json({ error: 'Falta campo obligatorio' });
        }
        const nombreLimpio = nombre.trim();

        if (uniqueName) {
          const [exist] = await pool.query(
            `SELECT ${idField} FROM ${tableName} WHERE ${nameField} = ?`,
            [nombreLimpio]
          );
          if (exist.length > 0) {
            return res.status(409).json({ error: `Ya existe un registro con ese nombre` });
          }
        }

        const [result] = await pool.query(
          `INSERT INTO ${tableName} (${nameField}, comentario) VALUES (?, ?)`,
          [nombre, comentario || null]
        );

        res.status(201).json({ id: result.insertId, message: 'Creado correctamente' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    },

    update: async (req, res) => {
      try {
        const id = req.params.id;
        const { nombre, comentario } = req.body;

        // Verificar que el registro exista
        const [existingRows] = await pool.query(
          `SELECT ${idField} FROM ${tableName} WHERE ${idField} = ?`,
          [id]
        );
        if (existingRows.length === 0) {
          return res.status(404).json({ error: 'No existe dicho registro' });
        }

        // Validar nombre obligatorio
        if (!nombre || nombre.trim() === '') {
          return res.status(400).json({ error: 'Falta campo obligatorio' });
        }

        const nombreLimpio = nombre.trim();

        // Verificar unicidad del nombre (excluyendo el actual)
        if (uniqueName) {
          const [existingWithSameName] = await pool.query(
            `SELECT ${idField} FROM ${tableName} WHERE ${nameField} = ? AND ${idField} != ?`,
            [nombreLimpio, id]
          );
          if (existingWithSameName.length > 0) {
            return res.status(409).json({ error: 'Ya existe una entidad con este nombre' });
          }
        }

        // Ejecutar UPDATE
        const [result] = await pool.query(
          `UPDATE ${tableName} SET ${nameField} = ?, comentario = ? WHERE ${idField} = ?`,
          [nombre, comentario || null, id]
        );

        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'No se pudo actualizar' });
        }

        res.json({ message: 'Registro modificado', affectedRows: result.affectedRows });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    },

    delete: async (req, res) => {
      try {
        const id = req.params.id;

        // Opcional: verificar existencia (aunque el DELETE también devolvería affectedRows=0)
        const [existingRows] = await pool.query(
          `SELECT ${idField} FROM ${tableName} WHERE ${idField} = ?`,
          [id]
        );
        if (existingRows.length === 0) {
          return res.status(404).json({ error: 'No existe dicho registro en la tabla' });
        }

        const [result] = await pool.query(
          `DELETE FROM ${tableName} WHERE ${idField} = ?`,
          [id]
        );

        res.json({ message: 'Registro eliminado', affectedRows: result.affectedRows });
      } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
          return res.status(409).json({ error: 'No se puede eliminar porque está siendo utilizado' });
        }
        res.status(500).json({ error: error.message });
      }
    }
  };
};

module.exports = createGenericController;