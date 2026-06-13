/**
 * Artista model - Represents an artist (author of one or more artworks).
 * Includes a virtual 'nombreCompleto' field and automatic Decimal128 conversion.
 */
const mongoose = require('mongoose');
const { convertDecimal128 } = require('../utils/decimalHelper');

const artistaSchema = new mongoose.Schema({
  artista_id_original: { type: Number },
  nombre: { type: String, required: true, trim: true },
  apellido: { type: String, trim: true },
  biografia: { type: String },
  fecha_nacimiento: { type: Date },
  nacionalidad: { type: String, trim: true },
  fotos: [{ type: String }],
  porcentaje_ganancia: { type: mongoose.Schema.Types.Decimal128, default: 5.0 },
  generos_artisticos: [{ type: String }],
  comentario: { type: String },
}, { timestamps: true });

artistaSchema.virtual('nombreCompleto').get(function () {
  return `${this.nombre || ''} ${this.apellido || ''}`.trim();
});

// Convert Decimal128 values to plain numbers + include virtuals
const toJSONConfig = {
  virtuals: true,
  transform: (_doc, ret) => {
    Object.keys(ret).forEach((key) => {
      if (ret[key] && typeof ret[key] === 'object' && ret[key].constructor && ret[key].constructor.name === 'Decimal128') {
        ret[key] = parseFloat(ret[key].toString());
      }
    });
    return ret;
  },
};
artistaSchema.set('toJSON', toJSONConfig);
artistaSchema.set('toObject', toJSONConfig);

artistaSchema.index({ nombre: 1, apellido: 1 });
artistaSchema.index({ nacionalidad: 1 });
artistaSchema.index({ artista_id_original: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Artista', artistaSchema);
