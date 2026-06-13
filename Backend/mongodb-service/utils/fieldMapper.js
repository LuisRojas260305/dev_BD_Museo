/**
 * Field mapper utility - transforms raw MongoDB artwork documents into the
 * frontend-friendly response format. Resolves artist names from both embedded
 * and populated artist data, and normalizes Decimal128 values to plain numbers.
 */
const { convertDecimal128 } = require('./decimalHelper');

/**
 * Resuelve el nombre completo del artista desde:
 * 1. obra.artista (embebido) - usado por aggregation vía $lookup
 * 2. obra.artista_id (populado vía .populate('artista_id')) - usado por getCatalogById
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

/**
 * Maps a raw artwork document to the API response format.
 * Converts Decimal128 values to numbers, resolves the artist display name,
 * and provides a stable obra_id (uses obra_id_original if available).
 *
 * @param {Object} obra - Raw artwork document from MongoDB.
 * @returns {Object} Mapped artwork object ready for JSON serialization.
 */
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
