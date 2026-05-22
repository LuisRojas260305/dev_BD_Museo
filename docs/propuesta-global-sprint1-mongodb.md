# Propuesta Global — Sprint 1: Servicio MongoDB

> **Proyecto**: Museo — Base de Datos 2 (Arquitectura Políglota)
> **Fecha**: 21 de mayo de 2026
> **Autor**: Equipo SBDII — Sprint 1
>
> Esta propuesta fusiona el enfoque de arquitectura de microservicios (propuesta del orquestador)
> con el diseño detallado del modelo de datos documental del documento `X.docx` (propuesta del compañero).

---

## 1. Visión General

Arquitectura políglota de 4 microservicios alrededor del core transaccional MySQL existente:

- **Sprint 1 (MongoDB)**: Catálogo dinámico de obras con esquema polimórfico por género.
  Servicio independiente en `Backend/mongodb-service/` puerto 3001.
- **Sprint 2 (Cassandra)**: Auditoría y reportes de eventos.
- **Sprint 3 (Neo4j)**: Recomendaciones basadas en artistas, estilos y temáticas.
- **Sprint 4**: Integración, documentación políglota, matriz CAP, landing page, live demo.

**Esta propuesta cubre exclusivamente Sprint 1.**

---

## 2. Intent — Por Qué MongoDB

MongoDB resuelve el problema central del catálogo de obras: **atributos heterogéneos por género**.
Con MySQL necesitamos 5 subtablas con herencia table-per-type + JOINs (Pintura, Escultura, Orfebrería,
Cerámica, Fotografía). Con MongoDB embebemos todo en un solo documento:

```json
{
  "_id": ObjectId,
  "nombre": "string",
  "genero": "Pintura",
  "precio_venta": NumberDecimal,
  "detalles": { /* campos específicos según género */ }
}
```

Esto elimina JOINs, simplifica las consultas de filtrado combinado
(género + precio + disponibilidad + atributo específico), y aprovecha el
**Aggregation Framework** para pipelines complejas en una sola operación.

---

## 3. Justificación del Modelo Documental — Embedding vs Referencias

### Polimorfismo estructural

En el modelo relacional cada especialidad de obra requería una tabla independiente
y múltiples JOINs. Con MongoDB una única colección `obras` donde `detalles` contiene
la estructura específica de cada género.

### Documentos embebidos para datos de consulta frecuente

| Dato | Estrategia | Razón |
|------|-----------|-------|
| Artista (nombre, apellido, nacionalidad) | **Embebido** en `obras.artista` | Se lee siempre con la obra. Evita `$lookup` en cada consulta. |
| Referencia a artista completo | **artista_id** (ObjectId) | Para updates de datos maestros y agregaciones detalladas. |
| Género, época, nacionalidad | **Embebido** (strings/objetos) | Catálogos pequeños y estables. Desnormalizados para acelerar lecturas. |
| Estilos, temáticas, materiales, técnicas | **Arrays de strings** en `detalles` | Relaciones M:M sin tablas intermedias. Filtrables con `$in`. |

### Referencias cuando es necesario

Colección independiente `artistas` con datos completos (biografía, foto URL,
porcentaje_ganancia, generos artísticos). Las obras referencian con `artista_id`
para actualizar info maestra sin modificar cada obra.

### Reducción: 16+ tablas → 2 colecciones

| Tabla MySQL | Equivalente MongoDB |
|-------------|-------------------|
| Obra + Pintura + Escultura + Fotografía + Cerámica + Orfebrería | `obras` con campo `detalles` polimórfico |
| Estilo, Temática, Material, Técnica, etc. | Arrays embebidos en `detalles` |
| Tablas intermedias M:M | Eliminadas (arrays resuelven la relación) |
| Época | Subdocumento embebido |
| Nacionalidad, Género | String embebido |
| Artista | Colección `artistas` + subdocumento embebido en obra |

---

## 4. Scope — Sprint 1

### In Scope

- [ ] Nuevo microservicio Node.js + Express + Mongoose en `Backend/mongodb-service/`
- [ ] Puerto 3001, independiente del monolito (puerto 3000)
- [ ] 2 colecciones: `artistas` y `obras` (polimórficas por género)
- [ ] Script ETL `scripts/migrate.js` (MySQL → MongoDB, batch de 100)
- [ ] API REST con 4 endpoints
- [ ] 7 pipelines Aggregation Framework (5 filtros/agrupación + `$text` search + `$facet` pagination)
- [ ] Feature flag frontend con fallback automático a MySQL
- [ ] Fotos como URLs (`fotos: [String]`) servidas desde el monolito

### Out of Scope

- [ ] Modificar backend MySQL existente o sus endpoints
- [ ] Cassandra (Sprint 2), Neo4j (Sprint 3), Event Bus (Sprint 4)
- [ ] Landing page interactiva ni documentación políglota final
- [ ] Test suite automatizada
- [ ] Autenticación en el servicio MongoDB

---

## 5. Arquitectura del Servicio

### Estructura de directorios

```
Backend/mongodb-service/
├── package.json
├── .env
├── server.js                # Express app, puerto 3001
├── config/
│   └── db.js               # Conexión Mongoose
├── models/
│   ├── Artista.js           # Schema artista
│   └── Obra.js              # Schema base + discriminators por género
├── routes/
│   └── catalog.routes.js
├── controllers/
│   └── catalog.controller.js  # Aggregation pipelines
├── scripts/
│   ├── migrate.js           # ETL batch MySQL → MongoDB
│   └── seed.js              # Bootstrap datos de ejemplo
└── middleware/
    └── errorHandler.js
```

### API Endpoints

| Endpoint | Query Params | Descripción |
|----------|-------------|-------------|
| `GET /api/catalog` | `genero`, `precio_min`, `precio_max`, `estado`, `page`, `limit` | Listado con filtros + `$facet` pagination |
| `GET /api/catalog/:id` | — | Detalle completo con campos del género |
| `GET /api/catalog/search` | `q`, `genero`, `precio_min`, `precio_max` | Búsqueda `$text` + filtros |
| `GET /api/catalog/health` | — | `{ status: "ok", mongodb: "connected" }` |

### Feature Flag (Frontend)

```js
// El frontend decide en runtime si consulta MongoDB o MySQL
const health = await fetch(`${MONGODB_URL}/api/catalog/health`).catch(() => null);
const baseURL = health?.ok ? MONGODB_URL : MYSQL_URL;
```

---

## 6. Esquema de Colecciones

### Colección `artistas`

```json
{
  "_id": ObjectId,
  "nombre": "string",
  "apellido": "string",
  "biografia": "string",
  "fecha_nacimiento": ISODate,
  "nacionalidad": "string",
  "fotos": ["string"],              // URLs al monolito (NO BinData)
  "porcentaje_ganancia": NumberDecimal,
  "generos_artisticos": ["string"],
  "comentario": "string"
}
```

**Índices**: `{ nombre: 1, apellido: 1 }`, `{ nacionalidad: 1 }`

### Colección `obras`

```json
{
  "_id": ObjectId,
  "nombre": "string",
  "codigo_inventario": "string",
  "artista_id": ObjectId,
  "artista": {
    "nombre": "string",
    "apellido": "string",
    "nacionalidad": "string"
  },
  "genero": "string",
  // "Pintura" | "Escultura" | "Orfebrería" | "Cerámica" | "Fotografía"
  "epoca": {
    "nombre": "string",
    "ano_inicio": "int",
    "ano_final": "int | null"
  },
  "precio_venta": NumberDecimal,
  "alto": NumberDecimal,
  "ancho": NumberDecimal,
  "fecha_creacion": ISODate,
  "estado": "string",
  // "Disponible" | "Reservada" | "Vendida"
  "fotos": ["string"],              // URLs al monolito
  "descripcion": "string",
  "comentario": "string",
  "detalles": { /* polimórfico según genero */ }
}
```

### Campos en `detalles` por género

| Género | Campos |
|--------|--------|
| **Pintura** | `soporte` (string), `estilos: [String]`, `tematicas: [String]` |
| **Escultura** | `peso` (Decimal), `profundidad` (Decimal), `tipo_escultura` (string), `materiales: [String]`, `tecnicas: [String]` |
| **Orfebrería** | `profundidad` (Decimal), `diametro` (Decimal), `peso` (Decimal), `pieza` (string), `metal_predominante` (string), `metales: [String]` |
| **Cerámica** | `profundidad` (Decimal), `diametro` (Decimal), `funcionalidad` (string), `coccion` (string), `arcilla` (string), `modelado` (string), `esmaltado` (string) |
| **Fotografía** | `tiraje` (int), `obturacion` (string), `apertura` (string), `iso` (int), `resolucion` (string), `fecha_captura` (ISODate), `impresion` (string), `camara` (string), `tecnica_fotografica` (string) |

**Índices**:
- `{ genero: 1, precio_venta: 1 }`
- `{ estado: 1, precio_venta: 1 }`
- `{ "detalles.estilos": 1 }`
- `{ nombre: "text", descripcion: "text" }` — `$text` index
- `{ codigo_inventario: 1 }`

---

## 7. ETL y Migración

**Estrategia**: Batch ETL (carga única). No hay writes concurrentes. Migración única
desde MySQL a MongoDB.

### Flujo de `scripts/migrate.js`

```
1. Conectar a MySQL (pool del monolito) + MongoDB
2. Migrar artistas:
   SELECT * FROM Persona WHERE es_artista = true
   → Mapear foto a URL (el monolito sirve las imágenes)
   → Batch insert 100 docs a MongoDB
3. Migrar obras:
   SELECT Obra + JOIN con subtabla según género
   → Armar documento con detalles polimórficos
   → Batch insert 100 docs a MongoDB
4. Crear índices en MongoDB
5. Verificar: conteo + sample docs
```

### Mapeo foto → URL

MySQL almacena fotos como `MediumBlob`. El monolito ya las sirve en `/uploads/`.
Guardamos `"fotos": ["/uploads/obra_123.jpg"]` en MongoDB. Esto:
- Evita el límite de 16MB de MongoDB
- Mantiene las fotos servidas desde el monolito
- No duplica almacenamiento

### Seed Data

Los documentos de ejemplo (Monet, Rodin, Picasso, Dorothea Lange, etc.)
se conservan como bootstrap de desarrollo en `scripts/seed.js`.

---

## 8. Aggregation Framework Pipelines

### 8.1 Filtro por rango de precio

```js
db.obras.aggregate([
  { $match: {
      precio_venta: { $gte: Decimal("50000"), $lte: Decimal("200000") }
  }},
  { $project: {
      nombre: 1, "artista.nombre": 1, "artista.apellido": 1,
      precio_venta: 1, estado: 1, _id: 0
  }}
]);
```

### 8.2 Filtro por género

```js
db.obras.aggregate([
  { $match: { genero: "Pintura" }},
  { $project: {
      nombre: 1, genero: 1, "detalles.soporte": 1,
      "detalles.estilos": 1, precio_venta: 1, estado: 1
  }}
]);
```

### 8.3 Disponibilidad + precio máximo (ordenado)

```js
db.obras.aggregate([
  { $match: {
      estado: "Disponible",
      precio_venta: { $lte: Decimal("1000000") }
  }},
  { $sort: { precio_venta: 1 }},
  { $project: {
      nombre: 1, codigo_inventario: 1, precio_venta: 1,
      genero: 1, "artista.nombre": 1
  }}
]);
```

### 8.4 Combinado: Pintura + Impresionismo + precio < 3M

```js
db.obras.aggregate([
  { $match: {
      genero: "Pintura",
      estado: "Disponible",
      "detalles.estilos": "Impresionismo",
      precio_venta: { $lt: Decimal("3000000") }
  }},
  { $project: {
      nombre: 1, "artista.nombre": 1,
      precio_venta: 1, "detalles.estilos": 1
  }}
]);
```

### 8.5 Agrupación por género

```js
db.obras.aggregate([
  { $group: {
      _id: "$genero",
      cantidad: { $sum: 1 },
      precio_promedio: { $avg: "$precio_venta" }
  }},
  { $sort: { cantidad: -1 }}
]);
```

### 8.6 Búsqueda full-text (`$text`)

```js
db.obras.aggregate([
  { $match: {
      $text: { $search: "impresion sol naciente" },
      genero: "Pintura"
  }},
  { $addFields: { relevancia: { $meta: "textScore" } }},
  { $sort: { relevancia: -1 }},
  { $limit: 20 }
]);
```

### 8.7 Paginación con `$facet`

```js
db.obras.aggregate([
  { $match: { genero: "Pintura", estado: "Disponible" }},
  { $facet: {
      metadata: [{ $count: "total" }],
      data: [{ $skip: 0 }, { $limit: 10 }]
  }}
]);
// → { metadata: [{ total: 42 }], data: [{...}] }
```

---

## 9. Decisiones Técnicas

| Decisión | Opciones | Elegido | Justificación |
|----------|----------|---------|---------------|
| Driver | Mongoose vs Native | **Mongoose** | Schemas con discriminators para género. Validación integrada. |
| Embedding vs Reference | Detalles vs colección separada | **Embebido** | Atributos de género siempre se leen junto con la obra. Un viaje a BD. |
| IDs | ObjectId vs UUID vs numérico | **ObjectId** + `obra_id` original | Estándar MongoDB. ID MySQL preservado para trazabilidad. |
| Discriminador | "tipo" vs "genero" | **`genero`** | Más semántico: "genero: Pintura" > "tipo: 1". Alineado con dominio del museo. |
| Fotos | BinData vs String URL | **`fotos: [String]`** | BinData > 16MB. Las fotos ya están en el monolito. URL evita duplicación. |
| Migración | ETL batch vs CDC vs seed | **ETL batch** | Carga única. No hay writes concurrentes. Seed scripts = bootstrap dev. |
| Búsqueda | `$match` regex vs `$text` | **`$text` index** | Performance: índices invertidos vs full-scan con regex. |
| Paginación | skip/limit vs `$facet` | **`$facet`** | Datos + conteo total en una pipeline. Dos operaciones en una. |
| Artista embedding | Sólo ref vs embebido+ref | **Ambos** | Embebido para lecturas rápidas. `artista_id` para joins cuando se necesita el documento completo. |
| Fallback | Toggle frontend vs proxy | **Feature flag frontend** | Simple: si health check pasa → MongoDB; si no → MySQL. Sin cambios de infra. |

---

## 10. Constraints

- **No romper endpoints del monolito MySQL**. La app debe seguir funcionando si MongoDB cae.
- **Feature flag toggleable**: frontend decide a quién consultar. Fallback automático si health check falla.
- **MongoDB en localhost:27017** (configurable vía `.env`).
- **Servicio deployable independientemente**: `npm start` arranca el servicio.
- **Fotos servidas desde el monolito**. MongoDB no almacena binarios.
- **Puerto 3001** para evitar conflicto con monolito (puerto 3000).

---

## 11. Success Criteria

- [ ] `GET /api/catalog` devuelve obras con atributos específicos según género
- [ ] Filtro combinado `?genero=pintura&precio_max=5000&estado=Disponible` funciona vía Aggregation Pipeline
- [ ] Búsqueda full-text `?q=impresion+sol` rankea por relevancia con `$text`
- [ ] Paginación `?page=1&limit=10` devuelve `{ data: [...], total: 42 }` con `$facet`
- [ ] Script ETL migra todas las obras + artistas sin errores
- [ ] Frontend muestra datos desde MongoDB (health check + feature flag)
- [ ] Health endpoint retorna `{ status: "ok", mongodb: "connected" }`
- [ ] Si MongoDB no responde, frontend cae gracefulmente al monolito
- [ ] Seed data bootstrap funciona para las 5 especialidades

---

## 12. Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Documentos demasiado grandes por embebido total | Baja | Fotos externalizadas como URLs. Si excede 16MB, mover historial a colección separada. |
| Migración lenta con muchas obras | Media | Batch inserts de 100 docs. Progreso logueado. |
| Frontend usa nombres de campo MySQL inexistentes en MongoDB | Media | Mapeo campo-a-campo en ETL. Nombres comunes se mantienen igual. |
| Equipo no conoce Aggregation Framework | Media | 7 pipelines documentadas con ejemplos concretos. Código comentado. |
| Inconsistencia MySQL ↔ MongoDB post-migración | Media | Migración snapshot. MongoDB = solo lectura. MySQL = fuente de verdad. |
| Tiempo insuficiente | Media | Priorización: API básica + ETL primero. Búsqueda + paginación después. |
