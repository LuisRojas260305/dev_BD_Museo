const mongoose = require('mongoose');

const generoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true, trim: true },
  descripcion: { type: String },
  comentario: { type: String },
}, { timestamps: true });

generoSchema.index({ nombre: 1 }, { unique: true });

module.exports = mongoose.model('Genero', generoSchema);
