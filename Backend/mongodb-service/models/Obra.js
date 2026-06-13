/**
 * Obra model - Core artwork entity using Mongoose discriminator pattern.
 * Base schema holds common fields (title, artist, price, dimensions, etc.)
 * while discriminators (Pintura, Escultura, Orfebrería, Cerámica, Fotografía)
 * add genre-specific detail fields.
 */
const mongoose = require('mongoose');
const { convertDecimal128 } = require('../utils/decimalHelper');

const obraSchema = new mongoose.Schema({
  obra_id_original: { type: Number },
  codigo_inventario: { type: String, required: true, trim: true },
  nombre: { type: String, required: true, default: 'Sin Título', trim: true },
  artista_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Artista' },
  artista: {
    nombre: { type: String },
    apellido: { type: String },
    nacionalidad: { type: String },
  },
  genero: {
    type: String,
    required: true,
    enum: ['Pintura', 'Escultura', 'Orfebrería', 'Cerámica', 'Fotografía', 'Cristalería', 'Textil', 'Grabado', 'Acuarela'],
  },
  epoca: {
    nombre: { type: String },
    ano_inicio: { type: Number },
    ano_final: { type: Number },
  },
  precio_venta: { type: mongoose.Schema.Types.Decimal128, required: true },
  alto: { type: mongoose.Schema.Types.Decimal128, default: 0 },
  ancho: { type: mongoose.Schema.Types.Decimal128, default: 0 },
  fecha_creacion: { type: Date },
  estado: {
    type: String,
    enum: ['Disponible', 'Reservada', 'Vendida'],
    default: 'Disponible',
  },
  fotos: [{ type: String }],
  descripcion: { type: String },
  comentario: { type: String },
}, {
  discriminatorKey: 'genero',
  timestamps: true,
});

// Convert Decimal128 values to plain numbers on serialization (JSON + Object)
const toJSONConfig = {
  transform: (_doc, ret) => {
    convertDecimal128(ret);
    return ret;
  },
};
obraSchema.set('toJSON', toJSONConfig);
obraSchema.set('toObject', toJSONConfig);

obraSchema.index({ genero: 1, precio_venta: 1 }, { background: true });
obraSchema.index({ estado: 1, precio_venta: 1 }, { background: true });
obraSchema.index({ codigo_inventario: 1 }, { unique: true, sparse: true, background: true });
obraSchema.index({ obra_id_original: 1 }, { unique: true, sparse: true, background: true });
obraSchema.index(
  { nombre: 'text', descripcion: 'text' },
  { weights: { nombre: 10, descripcion: 5 }, name: 'obra_text_index', background: true }
);

const Obra = mongoose.model('Obra', obraSchema);

Obra.discriminator('Pintura', new mongoose.Schema({
  detalles: {
    soporte: { type: String },
    estilos: [{ type: String }],
    tematicas: [{ type: String }],
  },
}));

Obra.discriminator('Escultura', new mongoose.Schema({
  detalles: {
    peso: { type: mongoose.Schema.Types.Decimal128 },
    profundidad: { type: mongoose.Schema.Types.Decimal128 },
    tipo_escultura: { type: String },
    materiales: [{ type: String }],
    tecnicas: [{ type: String }],
  },
}));

Obra.discriminator('Orfebrería', new mongoose.Schema({
  detalles: {
    profundidad: { type: mongoose.Schema.Types.Decimal128 },
    diametro: { type: mongoose.Schema.Types.Decimal128 },
    peso: { type: mongoose.Schema.Types.Decimal128 },
    pieza: { type: String },
    metal_predominante: { type: String },
    metales: [{ type: String }],
  },
}));

Obra.discriminator('Cerámica', new mongoose.Schema({
  detalles: {
    profundidad: { type: mongoose.Schema.Types.Decimal128 },
    diametro: { type: mongoose.Schema.Types.Decimal128 },
    funcionalidad: { type: String },
    coccion: { type: String },
    arcilla: { type: String },
    modelado: { type: String },
    esmaltado: { type: String },
  },
}));

Obra.discriminator('Fotografía', new mongoose.Schema({
  detalles: {
    tiraje: { type: Number },
    obturacion: { type: String },
    apertura: { type: String },
    iso: { type: Number },
    resolucion: { type: String },
    fecha_captura: { type: Date },
    impresion: { type: String },
    camara: { type: String },
    tecnica_fotografica: { type: String },
  },
}));

Obra.discriminator('Cristalería', new mongoose.Schema({
  detalles: {
    tipo_vidrio: { type: String },
    tecnica: { type: String },
    transparencia: { type: String },
    color: { type: String },
    profundidad: { type: mongoose.Schema.Types.Decimal128 },
    diametro: { type: mongoose.Schema.Types.Decimal128 },
    peso: { type: mongoose.Schema.Types.Decimal128 },
  },
}));

Obra.discriminator('Textil', new mongoose.Schema({
  detalles: {
    tipo_tejido: { type: String },
    fibra: [{ type: String }],
    tecnica: { type: String },
    urdimbre: { type: String },
    trama: { type: String },
  },
}));

Obra.discriminator('Grabado', new mongoose.Schema({
  detalles: {
    soporte: { type: String },
    tecnica_grabado: { type: String },
    tiraje: { type: Number },
    num_edicion: { type: String },
    tinta: { type: String },
  },
}));

Obra.discriminator('Acuarela', new mongoose.Schema({
  detalles: {
    soporte: { type: String },
    tecnica: { type: String },
    estilos: [{ type: String }],
    tematicas: [{ type: String }],
  },
}));

module.exports = Obra;
