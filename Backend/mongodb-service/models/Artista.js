const mongoose = require('mongoose');

const artistaSchema = new mongoose.Schema({
  artista_id_original: { type: Number, index: true, unique: true },
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

artistaSchema.set('toJSON', { virtuals: true });
artistaSchema.set('toObject', { virtuals: true });

artistaSchema.index({ nombre: 1, apellido: 1 });
artistaSchema.index({ nacionalidad: 1 });

module.exports = mongoose.model('Artista', artistaSchema);
