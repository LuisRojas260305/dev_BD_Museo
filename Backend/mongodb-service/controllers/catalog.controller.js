const Artista = require('../models/Artista');
const Obra = require('../models/Obra');
const fieldMapper = require('../utils/fieldMapper');
const { createContext, addView } = require('../../shared/sslContext');
const { logEvent } = require('../../shared/sslLogger');

const getCatalog = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const match = {};
    if (req.query.genero) match.genero = req.query.genero;
    if (req.query.estado) match.estado = req.query.estado;
    if (req.query.artista_id) {
      match.artista_id = new (require('mongoose').Types.ObjectId)(req.query.artista_id);
    }
    if (req.query.precio_min || req.query.precio_max) {
      match.precio_venta = {};
      if (req.query.precio_min) match.precio_venta.$gte = parseFloat(req.query.precio_min);
      if (req.query.precio_max) match.precio_venta.$lte = parseFloat(req.query.precio_max);
    }

    const pipeline = [
      { $match: match },
      // Resolver artista_id → artista embebido (funciona para obras sin artista subdoc)
      {
        $lookup: {
          from: 'artistas',
          localField: 'artista_id',
          foreignField: '_id',
          as: 'artista',
        },
      },
      { $unwind: { path: '$artista', preserveNullAndEmptyArrays: true } },
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

    // SSL — registrar vista de obra
    const sslId = req.headers['x-ssl-id'] || req.ssl?.ssl_id;
    if (sslId) {
      const ctxActualizado = addView(sslId, id, 'detalle');
      if (ctxActualizado) {
        logEvent(sslId, 'vista-obra', { obra_id: id, titulo: obra.titulo });
      }
    }

    const result = fieldMapper(obra.toObject());

    // Asegurar que artista_id sea siempre un string (no el objeto populado)
    // para que el frontend pueda usarlo en links como artista.html?id=XXX
    if (result.artista_id && typeof result.artista_id === 'object') {
      result.artista_id = result.artista_id._id ? result.artista_id._id.toString() : null;
    }

    res.json({ success: true, data: result });
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
      // Resolver artista_id → artista embebido
      {
        $lookup: {
          from: 'artistas',
          localField: 'artista_id',
          foreignField: '_id',
          as: 'artista',
        },
      },
      { $unwind: { path: '$artista', preserveNullAndEmptyArrays: true } },
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

const createSslContext = (req, res) => {
    const ctx = createContext();
    logEvent(ctx.ssl_id, 'contexto-creado', { endpoint: '/ssl/contexto' });
    res.json({ success: true, data: { ssl_id: ctx.ssl_id, creado_en: ctx.creado_en, ttl: ctx.ttl } });
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

// ---------------------------------------------------------------------------
// CRUD de Obras (admin)
// ---------------------------------------------------------------------------

const VALID_GENEROS = ['Pintura', 'Escultura', 'Orfebrería', 'Cerámica', 'Fotografía'];

/**
 * Valida que el género sea uno de los válidos.
 */
function validateGenero(genero) {
    if (!genero) return 'El campo genero es requerido';
    if (!VALID_GENEROS.includes(genero)) {
        return `Género inválido. Valores: ${VALID_GENEROS.join(', ')}`;
    }
    return null;
}

/**
 * POST /api/catalog — Crear una obra
 * Recibe JSON con datos de obra (sin foto binaria).
 */
const createObra = async (req, res, next) => {
    try {
        const { genero, ...obraData } = req.body;

        // Validar género
        const errorGenero = validateGenero(genero);
        if (errorGenero) {
            return res.status(400).json({ success: false, error: errorGenero });
        }

        // Validar campos comunes requeridos por el schema de Mongoose
        if (!obraData.codigo_inventario) {
            return res.status(400).json({
                success: false,
                error: 'El campo codigo_inventario es requerido',
            });
        }
        if (obraData.precio_venta === undefined || obraData.precio_venta === null) {
            return res.status(400).json({
                success: false,
                error: 'El campo precio_venta es requerido',
            });
        }

        // Si viene artista_id como string, convertirlo a ObjectId
        if (obraData.artista_id && typeof obraData.artista_id === 'string') {
            obraData.artista_id = new (require('mongoose').Types.ObjectId)(obraData.artista_id);
        }

        // Poblar artista embebido desde la referencia (para que fieldMapper funcione)
        if (obraData.artista_id) {
            const artistaDoc = await Artista.findById(obraData.artista_id);
            if (artistaDoc) {
                obraData.artista = {
                    nombre: artistaDoc.nombre,
                    apellido: artistaDoc.apellido,
                    nacionalidad: artistaDoc.nacionalidad,
                };
            }
        }

        // Crear la obra — Mongoose usa el discriminatorKey 'genero' para
        // elegir automáticamente el discriminator correcto (Pintura, Escultura, etc.)
        const obra = await Obra.create({ genero, ...obraData });

        res.status(201).json({ success: true, data: fieldMapper(obra.toObject()) });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/catalog/:id — Actualizar una obra existente
 * Recibe JSON con campos a actualizar (merge parcial).
 */
const updateObra = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Validar género si se cambia
        if (updateData.genero) {
            const errorGenero = validateGenero(updateData.genero);
            if (errorGenero) {
                return res.status(400).json({ success: false, error: errorGenero });
            }
        }

        // Convertir artista_id si viene como string
        if (updateData.artista_id && typeof updateData.artista_id === 'string') {
            updateData.artista_id = new (require('mongoose').Types.ObjectId)(updateData.artista_id);
        }

        // Poblar artista embebido desde la referencia
        if (updateData.artista_id) {
            const artistaDoc = await Artista.findById(updateData.artista_id);
            if (artistaDoc) {
                updateData.artista = {
                    nombre: artistaDoc.nombre,
                    apellido: artistaDoc.apellido,
                    nacionalidad: artistaDoc.nacionalidad,
                };
            }
        } else if (updateData.artista_id === null || updateData.artista_id === '') {
            // Si desasocian el artista, limpiar el embebido también
            updateData.artista = null;
        }

        const obra = await Obra.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
            context: 'query',
        });

        if (!obra) {
            return res.status(404).json({ success: false, error: 'Obra no encontrada' });
        }

        res.json({ success: true, data: fieldMapper(obra.toObject()) });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/catalog/:id — Eliminar una obra
 */
const deleteObra = async (req, res, next) => {
    try {
        const { id } = req.params;

        const obra = await Obra.findByIdAndDelete(id);

        if (!obra) {
            return res.status(404).json({ success: false, error: 'Obra no encontrada' });
        }

        res.json({ success: true, message: 'Obra eliminada correctamente' });
    } catch (err) {
        next(err);
    }
};

module.exports = { getCatalog, getCatalogById, searchCatalog, createSslContext, healthCheck, createObra, updateObra, deleteObra };
