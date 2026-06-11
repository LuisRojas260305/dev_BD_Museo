/**
 * Genero model - Represents an artwork genre (e.g., Pintura, Escultura).
 * Used as a reference collection for genre categorization.
 */
const mongoose = require('mongoose');

const generoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true, trim: true },
  descripcion: { type: String },
  comentario: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Genero', generoSchema);
