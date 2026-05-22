const Artista = require('../models/Artista');
const Obra = require('../models/Obra');
const fieldMapper = require('../utils/fieldMapper');

const getCatalog = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const match = {};
    if (req.query.genero) match.genero = req.query.genero;
    if (req.query.estado) match.estado = req.query.estado;
    if (req.query.precio_min || req.query.precio_max) {
      match.precio_venta = {};
      if (req.query.precio_min) match.precio_venta.$gte = parseFloat(req.query.precio_min);
      if (req.query.precio_max) match.precio_venta.$lte = parseFloat(req.query.precio_max);
    }

    const pipeline = [
      { $match: match },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
          ],
        },
      },
    ];

    const results = await Obra.aggregate(pipeline);
    const total = results[0]?.metadata[0]?.total || 0;
    const obras = (results[0]?.data || []).map(fieldMapper);

    res.json({
      success: true,
      data: obras,
      total,
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
};

const getCatalogById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let obra;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

    if (isObjectId) {
      obra = await Obra.findById(id).populate('artista_id');
    } else if (/^\d+$/.test(id)) {
      obra = await Obra.findOne({ obra_id_original: parseInt(id) }).populate('artista_id');
    } else {
      return res.status(400).json({ success: false, error: 'ID inválido' });
    }

    if (!obra) {
      return res.status(404).json({ success: false, error: 'Obra no encontrada' });
    }

    res.json({ success: true, data: fieldMapper(obra.toObject()) });
  } catch (err) {
    next(err);
  }
};

const searchCatalog = async (req, res, next) => {
  try {
    const { q, genero, precio_min, precio_max } = req.query;

    const match = {
      $text: { $search: q },
    };

    if (genero) match.genero = genero;
    if (precio_min || precio_max) {
      match.precio_venta = {};
      if (precio_min) match.precio_venta.$gte = parseFloat(precio_min);
      if (precio_max) match.precio_venta.$lte = parseFloat(precio_max);
    }

    const obras = await Obra.aggregate([
      { $match: match },
      { $addFields: { relevancia: { $meta: 'textScore' } } },
      { $sort: { relevancia: -1 } },
      { $limit: 20 },
    ]);

    res.json({
      success: true,
      data: obras.map(fieldMapper),
    });
  } catch (err) {
    next(err);
  }
};

const healthCheck = (req, res) => {
  const { getConnectionStatus } = require('../config/db');
  const state = getConnectionStatus();

  if (state === 1) {
    res.set('Cache-Control', 'no-cache');
    res.json({ status: 'ok', mongodb: 'connected' });
  } else {
    res.status(503).json({ status: 'error', mongodb: 'disconnected' });
  }
};

module.exports = { getCatalog, getCatalogById, searchCatalog, healthCheck };
