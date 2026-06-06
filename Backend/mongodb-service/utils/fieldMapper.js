const { convertDecimal128 } = require('./decimalHelper');

/**
 * Resuelve el nombre completo del artista desde:
 * 1. obra.artista (embebido) — usado por aggregation vía $lookup
 * 2. obra.artista_id (populado vía .populate('artista_id')) — usado por getCatalogById
 */
function resolveArtistaNombre(obra) {
  if (obra.artista) {
    return `${obra.artista.nombre || ''} ${obra.artista.apellido || ''}`.trim() || null;
  }
  if (obra.artista_id && typeof obra.artista_id === 'object' && obra.artista_id.nombre) {
    return `${obra.artista_id.nombre || ''} ${obra.artista_id.apellido || ''}`.trim() || null;
  }
  return null;
}

const fieldMapper = (obra) => {
  // Deep-clone and convert all Decimal128 values to numbers.
  // Works for both top-level fields (precio_venta, alto, ancho) and
  // nested discriminator fields (detalles.peso, detalles.profundidad, etc.)
  const mapped = convertDecimal128({ ...obra });

  return {
    ...mapped,
    artista_nombre: resolveArtistaNombre(obra),
    genero_nombre: obra.genero,
    obra_id: obra.obra_id_original || obra._id,
  };
};

module.exports = fieldMapper;
