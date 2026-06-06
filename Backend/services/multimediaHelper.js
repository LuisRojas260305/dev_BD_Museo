/**
 * Helper para manejo de fotos en la tabla Multimedia de MySQL.
 * Proporciona operaciones CRUD básicas sobre archivos multimedia.
 */
const { pool } = require('../config/database');

const TABLE = 'Multimedia';

/**
 * Guarda una foto en la tabla Multimedia.
 * @param {string} entidad_tipo - Tipo de entidad (ej: 'obra', 'artista')
 * @param {string|null} entidad_id - ID de la entidad (puede ser null si se asigna después)
 * @param {Buffer} fileBuffer - Contenido binario del archivo
 * @param {string} mimetype - Tipo MIME del archivo
 * @returns {Promise<number>} - ID del registro multimedia creado
 */
async function saveFoto(entidad_tipo, entidad_id, fileBuffer, mimetype) {
    const [result] = await pool.execute(
        `INSERT INTO ${TABLE} (entidad_tipo, entidad_id, archivo, tipo_mime) VALUES (?, ?, ?, ?)`,
        [entidad_tipo, entidad_id || null, fileBuffer, mimetype || 'image/jpeg']
    );
    return result.insertId;
}

/**
 * Obtiene una foto por su ID.
 * @param {number} multimedia_id - ID del registro multimedia
 * @returns {Promise<{archivo: Buffer, tipo_mime: string}|null>}
 */
async function getFoto(multimedia_id) {
    const [rows] = await pool.execute(
        `SELECT archivo, tipo_mime FROM ${TABLE} WHERE multimedia_id = ?`,
        [multimedia_id]
    );
    if (rows.length === 0) return null;
    return rows[0];
}

/**
 * Elimina una foto por su ID.
 * @param {number} multimedia_id - ID del registro multimedia
 */
async function deleteFoto(multimedia_id) {
    await pool.execute(
        `DELETE FROM ${TABLE} WHERE multimedia_id = ?`,
        [multimedia_id]
    );
}

/**
 * Elimina todas las fotos asociadas a una entidad.
 * @param {string} entidad_tipo - Tipo de entidad
 * @param {string} entidad_id - ID de la entidad
 */
async function deleteFotosByEntidad(entidad_tipo, entidad_id) {
    await pool.execute(
        `DELETE FROM ${TABLE} WHERE entidad_tipo = ? AND entidad_id = ?`,
        [entidad_tipo, entidad_id]
    );
}

module.exports = { saveFoto, getFoto, deleteFoto, deleteFotosByEntidad };
