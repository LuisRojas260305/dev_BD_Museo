const Artista = require('../models/Artista');

const getArtists = async (req, res, next) => {
  try {
    const sort = req.query.sort === 'nombre' ? { nombre: 1, apellido: 1 } : { createdAt: -1 };
    const artistas = await Artista.find({}).sort(sort);
    res.json({ success: true, data: artistas });
  } catch (err) {
    next(err);
  }
};

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
