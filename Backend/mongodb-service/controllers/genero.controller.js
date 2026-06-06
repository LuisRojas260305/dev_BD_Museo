/**
 * Genre controller — CRUD operations for artwork genres (géneros).
 */
const Genero = require('../models/Genero');
const Obra = require('../models/Obra');

/**
 * GET /api/catalog/generos — Lists all genres sorted by name.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const getGeneros = async (req, res, next) => {
  try {
    const generos = await Genero.find({}).sort({ nombre: 1 });
    res.json({ success: true, data: generos });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/catalog/generos/:id — Returns a single genre by ID.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const getGeneroById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const genero = await Genero.findById(id);
    if (!genero) {
      return res.status(404).json({ success: false, error: 'Género no encontrado' });
    }
    res.json({ success: true, data: genero });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/catalog/generos — Creates a new genre.
 * Returns 409 if the genre name already exists (unique constraint).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const createGenero = async (req, res, next) => {
  try {
    const genero = await Genero.create(req.body);
    res.status(201).json({ success: true, data: genero });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: 'El género ya existe' });
    }
    next(err);
  }
};

/**
 * PUT /api/catalog/generos/:id — Updates an existing genre.
 * Returns 409 on duplicate name.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const updateGenero = async (req, res, next) => {
  try {
    const genero = await Genero.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!genero) {
      return res.status(404).json({ success: false, error: 'Género no encontrado' });
    }
    res.json({ success: true, data: genero });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: 'El género ya existe' });
    }
    next(err);
  }
};

/**
 * DELETE /api/catalog/generos/:id — Deletes a genre if no artworks are associated.
 * Returns 409 if associated artworks exist, preventing orphaned references.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const deleteGenero = async (req, res, next) => {
  try {
    const genero = await Genero.findById(req.params.id);
    if (!genero) {
      return res.status(404).json({ success: false, error: 'Género no encontrado' });
    }

    // Verificar que no haya obras asociadas a este género
    const obrasCount = await Obra.countDocuments({ genero: genero.nombre });
    if (obrasCount > 0) {
      return res.status(409).json({
        success: false,
        error: `No se puede eliminar el género "${genero.nombre}" porque tiene ${obrasCount} obra(s) asociada(s)`,
      });
    }

    await Genero.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Género eliminado correctamente' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getGeneros, getGeneroById, createGenero, updateGenero, deleteGenero };
