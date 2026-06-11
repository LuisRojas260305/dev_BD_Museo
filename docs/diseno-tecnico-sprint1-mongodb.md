# Diseño Técnico - Sprint 1: Servicio MongoDB

> **Proyecto**: Museo - Base de Datos 2
> **Fecha**: 21 de mayo de 2026
> **Basado en**: docs/propuesta-global-sprint1-mongodb.md, docs/decisiones/decisiones-clave-sprint1.md

---

## A. Estructura del Proyecto

```
Backend/mongodb-service/
├-- package.json                    # Dependencias: express, mongoose, dotenv, cors, mysql2
├-- .env                            # MONGODB_URI, PORT, MYSQL_*
├-- server.js                       # Entry point: Express + Mongoose + rutas
├-- config/
│   ├-- db.js                       # Conexión Mongoose con pool y retry
│   └-- mysql.js                    # Pool mysql2/promise para ETL
├-- models/
│   ├-- Artista.js                  # Schema artista con índices
│   └-- Obra.js                     # Schema BASE + 5 discriminators por género
├-- routes/
│   └-- catalog.routes.js           # 4 rutas REST
├-- controllers/
│   └-- catalog.controller.js       # 4 controladores con Aggregation Framework
├-- middleware/
│   ├-- errorHandler.js             # Global error handler
│   └-- validation.js               # Validación de query params
├-- scripts/
│   ├-- migrate.js                  # ETL MySQL → MongoDB
│   └-- seed.js                     # Bootstrap datos de ejemplo
└-- utils/
    └-- fieldMapper.js              # Helper transformación campos MongoDB → frontend
```

---

## B. Conexión a Base de Datos

### Config (`config/db.js`)

```js
const mongoose = require('mongoose');

const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    heartbeatFrequencyMS: 10000,
    socketTimeoutMS: 45000,
  });
  console.log(`MongoDB conectado: ${conn.connection.host}`);
  return conn;
};

mongoose.connection.on('error', (err) => {
  console.error('Error de conexión MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB desconectado. Intentando reconectar...');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = connectDB;
```

### Variables de Entorno (`.env`)

```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/museo_catalogo
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=museo
```

---

## C. Schemas Mongoose

### Artista (`models/Artista.js`)

```js
const mongoose = require('mongoose');

const artistaSchema = new mongoose.Schema({
  artista_id_original: { type: Number, index: true, unique: true },
  nombre:              { type: String, required: true, trim: true },
  apellido:            { type: String, trim: true },
  biografia:           { type: String },
  fecha_nacimiento:    { type: Date },
  nacionalidad:        { type: String, trim: true },
  fotos:               [{ type: String }],
  porcentaje_ganancia: { type: mongoose.Schema.Types.Decimal128, default: 5.0 },
  generos_artisticos:  [{ type: String }],
  comentario:          { type: String }
}, { timestamps: true });

artistaSchema.index({ nombre: 1, apellido: 1 });
artistaSchema.index({ nacionalidad: 1 });

module.exports = mongoose.model('Artista', artistaSchema);
```

### Obra + 5 Discriminators (`models/Obra.js`)

```js
const mongoose = require('mongoose');

const obraSchema = new mongoose.Schema({
  obra_id_original:   { type: Number, index: true, unique: true },
  codigo_inventario:  { type: String, required: true, unique: true, trim: true },
  nombre:             { type: String, required: true, default: 'Sin Título', trim: true },
  artista_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'Artista' },
  artista: {
    nombre:       { type: String },
    apellido:     { type: String },
    nacionalidad: { type: String }
  },
  genero: {
    type: String,
    required: true,
    enum: ['Pintura', 'Escultura', 'Orfebrería', 'Cerámica', 'Fotografía']
  },
  epoca: {
    nombre:     { type: String },
    ano_inicio: { type: Number },
    ano_final:  { type: Number }
  },
  precio_venta:     { type: mongoose.Schema.Types.Decimal128, required: true },
  alto:             { type: mongoose.Schema.Types.Decimal128, default: 0 },
  ancho:            { type: mongoose.Schema.Types.Decimal128, default: 0 },
  fecha_creacion:   { type: Date },
  estado: {
    type: String,
    enum: ['Disponible', 'Reservada', 'Vendida'],
    default: 'Disponible'
  },
  fotos:            [{ type: String }],
  descripcion:      { type: String },
  comentario:       { type: String }
}, {
  discriminatorKey: 'genero',
  timestamps: true
});

// Índices base
obraSchema.index({ genero: 1, precio_venta: 1 });
obraSchema.index({ estado: 1, precio_venta: 1 });
obraSchema.index({ codigo_inventario: 1 });
obraSchema.index({ nombre: 'text', descripcion: 'text' },
  { weights: { nombre: 10, descripcion: 5 }, name: 'obra_text_index' });

const Obra = mongoose.model('Obra', obraSchema);

// --- DISCRIMINATORS ---

// Pintura
Obra.discriminator('Pintura', new mongoose.Schema({
  detalles: {
    soporte:   { type: String },
    estilos:   [{ type: String }],
    tematicas: [{ type: String }]
  }
}));

// Escultura
Obra.discriminator('Escultura', new mongoose.Schema({
  detalles: {
    peso:           { type: mongoose.Schema.Types.Decimal128 },
    profundidad:    { type: mongoose.Schema.Types.Decimal128 },
    tipo_escultura: { type: String },
    materiales:     [{ type: String }],
    tecnicas:       [{ type: String }]
  }
}));

// Orfebrería
Obra.discriminator('Orfebrería', new mongoose.Schema({
  detalles: {
    profundidad:        { type: mongoose.Schema.Types.Decimal128 },
    diametro:           { type: mongoose.Schema.Types.Decimal128 },
    peso:               { type: mongoose.Schema.Types.Decimal128 },
    pieza:              { type: String },
    metal_predominante: { type: String },
    metales:            [{ type: String }]
  }
}));

// Cerámica
Obra.discriminator('Cerámica', new mongoose.Schema({
  detalles: {
    profundidad:   { type: mongoose.Schema.Types.Decimal128 },
    diametro:      { type: mongoose.Schema.Types.Decimal128 },
    funcionalidad: { type: String },
    coccion:       { type: String },
    arcilla:       { type: String },
    modelado:      { type: String },
    esmaltado:     { type: String }
  }
}));

// Fotografía
Obra.discriminator('Fotografía', new mongoose.Schema({
  detalles: {
    tiraje:              { type: Number },
    obturacion:          { type: String },
    apertura:            { type: String },
    iso:                 { type: Number },
    resolucion:          { type: String },
    fecha_captura:       { type: Date },
    impresion:           { type: String },
    camara:              { type: String },
    tecnica_fotografica: { type: String }
  }
}));

module.exports = Obra;
```

### Resumen de Índices

| Colección | Índice | Propósito |
|-----------|--------|-----------|
| artistas | `{ nombre: 1, apellido: 1 }` | Búsqueda por nombre |
| artistas | `{ nacionalidad: 1 }` | Filtro por nacionalidad |
| artistas | `{ artista_id_original: 1 }` (único) | Lookup por ID MySQL |
| obras | `{ genero: 1, precio_venta: 1 }` | Filtro combinado |
| obras | `{ estado: 1, precio_venta: 1 }` | Disponibilidad + precio |
| obras | `{ codigo_inventario: 1 }` (único) | Búsqueda exacta |
| obras | `{ nombre: "text", descripcion: "text" }` | Búsqueda full-text |
| obras | `{ obra_id_original: 1 }` (único) | Lookup por ID MySQL |

---

## D. Controladores

### `getCatalog` - Listado con filtros + paginación

```
INPUT: req.query { genero, precio_min, precio_max, estado, page, limit }

1. Validar params (precio_min <= precio_max, page >= 1, limit 1-100)
2. Construir $match dinámico según filtros presentes
3. Pipeline: [{ $match }, { $facet: { metadata: [$count], data: [$skip, $limit] } }]
4. Response: { success: true, data: [...], total: N, page: N, limit: N }
```

### `getCatalogById` - Detalle con resolución dual de ID

```
INPUT: req.params.id

1. ¿ObjectId válido? (24 hex chars) → buscar por _id
2. ¿String numérico? → buscar por obra_id_original
3. Si no coincide ningún formato → 400
4. $lookup a artistas para datos completos del artista
```

### `searchCatalog` - Búsqueda full-text

```
INPUT: req.query { q, genero, precio_min, precio_max }

1. q requerido, mínimo 2 caracteres
2. $match: { $text: { $search: q } } + filtros opcionales
3. $addFields: relevancia: { $meta: "textScore" }
4. $sort: { relevancia: -1 }, $limit: 20
```

### `healthCheck` - Estado del servicio

```
INPUT: req, res

1. Verificar mongoose.connection.readyState
   - 1 (connected) → 200 { status: "ok", mongodb: "connected" }
   - Otro → 503 { status: "error", mongodb: "disconnected" }
2. Cache-Control: no-cache
```

---

## E. Script de Migración (ETL)

### Flujo de `scripts/migrate.js`

```
FASE 1: Conectar a MySQL + MongoDB
FASE 2: Migrar Artistas
  - SELECT FROM Artista JOIN Nacionalidad
  - Mapear foto (MediumBlob) → URL string (/uploads/artista_{id}.jpg)
  - Batch insert 100 docs (ordered: false)
  - Construir Map<mysql_id, mongodb_id>
FASE 3: Migrar Obras
  - SELECT Obra JOIN Genero, Epoca
  - LEFT JOIN subtabla según genero_id (5 cases diferentes)
  - Armar documento con detalles polimórfico
  - Batch insert 100 docs (ordered: false)
FASE 4: Crear índices
FASE 5: Verificar conteos
FASE 6: Cerrar conexiones
```

---

## F. Script de Seed

5 obras (1 por género) + 3 artistas. Datos de ejemplo autocontenidos
(sin dependencia de MySQL). Ejecutable via `npm run seed`.

---

## G. Integración Frontend

### Feature Flag

```js
// En Frontend/js/auth.js
const MONGODB_URL = 'http://localhost:3001';
let mongodbAvailable = null;
let lastHealthCheck = 0;
const HEALTH_CACHE_TTL = 300000; // 5 min

async function isMongoDBAvailable() {
  // Cache + health check con timeout 3s
}

function getCatalogBaseURL() {
  return mongodbAvailable ? MONGODB_URL : API_BASE;
}
```

### Adaptación de Campos (MongoDB → Frontend)

| Frontend espera | MongoDB devuelve | Adaptación |
|----------------|-----------------|------------|
| `obra.artista_nombre` | `obra.artista.nombre + obra.artista.apellido` | `artista?.nombre + ' ' + artista?.apellido` |
| `obra.genero_nombre` | `obra.genero` | Directo |
| `obra.obra_id` | `obra._id` o `obra.obra_id_original` | Usar `obra_id_original` |
| `obra.detalles.soporte_nombre` | `obra.detalles.soporte` | Directo |
| `precio_venta` (number) | `precio_venta` (Decimal128) | `Number(obra.precio_venta?._serialized)` |

---

## H. Manejo de Errores

| Situación | Status | Body |
|-----------|--------|------|
| precio_min > precio_max | 400 | `{ success: false, error: "precio_max debe ser mayor que precio_min" }` |
| page < 1 | 400 | `{ success: false, error: "page debe ser >= 1" }` |
| limit > 100 | 400 | `{ success: false, error: "limit máximo es 100" }` |
| q < 2 caracteres | 400 | `{ success: false, error: "q debe tener al menos 2 caracteres" }` |
| ID inválido | 400 | `{ success: false, error: "ID inválido" }` |
| Obra no encontrada | 404 | `{ success: false, error: "Obra no encontrada" }` |
| MongoDB desconectado | 503 | `{ success: false, error: "Servicio no disponible", mongodb: "disconnected" }` |

---

## I. Dependencias (`package.json`)

```json
{
  "name": "mongodb-service",
  "version": "1.0.0",
  "description": "Servicio MongoDB para catálogo dinámico de obras",
  "main": "server.js",
  "type": "commonjs",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js",
    "migrate": "node scripts/migrate.js",
    "seed": "node scripts/seed.js"
  },
  "dependencies": {
    "cors": "^2.8.6",
    "dotenv": "^17.3.1",
    "express": "^5.2.1",
    "mongoose": "^8.14.0",
    "mysql2": "^3.17.2"
  }
}
```
