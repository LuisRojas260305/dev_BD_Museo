/**
 * Artist controller — CRUD operations for museum artists (artistas).
 */
const Artista = require('../models/Artista');

/**
 * GET /api/catalog/artists — Lists all artists, optionally sorted by name.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const getArtists = async (req, res, next) => {
  try {
    const sort = req.query.sort === 'nombre' ? { nombre: 1, apellido: 1 } : { createdAt: -1 };
    const artistas = await Artista.find({}).sort(sort);
    res.json({ success: true, data: artistas });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/catalog/artists/:id — Returns a single artist by MongoDB ObjectId or original numeric ID.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const getArtistById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let artista;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    if (isObjectId) {
      artista = await Artista.findById(id);
    } else {
      artista = await Artista.findOne({ artista_id_original: parseInt(id) });
    }
    if (!artista) return res.status(404).json({ success: false, error: 'Artista no encontrado' });
    res.json({ success: true, data: artista });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/catalog/artists — Creates a new artist.
 * Handles generos_artisticos as a JSON string for multipart/form-data support.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const createArtist = async (req, res, next) => {
  try {
    const body = { ...req.body };

    // Parse generos_artisticos if it came as a JSON string (common with FormData/multipart)
    if (body.generos_artisticos && typeof body.generos_artisticos === 'string') {
      try {
        body.generos_artisticos = JSON.parse(body.generos_artisticos);
      } catch {
        // If it's not valid JSON, keep it as-is (Mongoose will handle validation)
      }
    }

    const artista = await Artista.create(body);
    res.status(201).json({ success: true, data: artista });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, error: 'Artista duplicado' });
    next(err);
  }
};

/**
 * PUT /api/catalog/artists/:id — Updates an existing artist (partial merge).
 * Handles generos_artisticos as a JSON string for multipart/form-data support.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const updateArtist = async (req, res, next) => {
  try {
    const body = { ...req.body };

    // Parse generos_artisticos if it came as a JSON string (common with FormData/multipart)
    if (body.generos_artisticos && typeof body.generos_artisticos === 'string') {
      try {
        body.generos_artisticos = JSON.parse(body.generos_artisticos);
      } catch {
        // If it's not valid JSON, keep it as-is
      }
    }

    const artista = await Artista.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!artista) return res.status(404).json({ success: false, error: 'Artista no encontrado' });
    res.json({ success: true, data: artista });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/catalog/artists/:id — Deletes an artist by ID.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const deleteArtist = async (req, res, next) => {
  try {
    const artista = await Artista.findByIdAndDelete(req.params.id);
    if (!artista) return res.status(404).json({ success: false, error: 'Artista no encontrado' });
    res.json({ success: true, message: 'Artista eliminado' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getArtists, getArtistById, createArtist, updateArtist, deleteArtist };
