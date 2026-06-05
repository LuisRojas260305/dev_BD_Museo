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

module.exports = { getArtists, getArtistById };
