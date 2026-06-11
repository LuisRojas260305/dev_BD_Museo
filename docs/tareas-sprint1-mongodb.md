# Plan de Tareas - Sprint 1: Servicio MongoDB

> **Proyecto**: Museo - Base de Datos 2
> **Fecha**: 21 de mayo de 2026 - Planificación pre-implementación
> **Implementación**: Mañana (22 de mayo)
> **Basado en**: docs/diseno-tecnico-sprint1-mongodb.md

---

## Orden de Ejecución

```
TASK-1 --- TASK-2 --- TASK-3 --- TASK-4 --- TASK-5
                                    │
TASK-9 ◄----------------------------┤
TASK-10 ◄-- TASK-1                  │
TASK-11 ◄-- TASK-1                  │
                                    │
TASK-6  ◄---------------------------┤
TASK-7  ◄---------------------------┤
TASK-8  ◄---------------------------┤
                                    │
TASK-12 ◄-- TASK-3 + TASK-4        │
TASK-13 ◄-- TASK-5                  │
                                    │
TASK-14 ◄-- TASK-9                  │
TASK-15 ◄-- TASK-14 + TASK-6        │
TASK-16 ◄-- TASK-14 + TASK-7        │
                                    │
TASK-17 ◄-- ALL ABOVE               │
```

---

## Group 1: Project Setup

### TASK-1: Inicializar proyecto mongodb-service
**Archivos**: `Backend/mongodb-service/package.json` (crear), `.env` (crear), `.gitignore` (crear), `server.js` (crear)
**Dependencias**: Ninguna
**Esfuerzo**: Pequeño

**Criterios de aceptación**:
- [ ] `package.json` con dependencias: express ^5.2.1, mongoose ^8.14.0, mysql2 ^3.17.2, dotenv ^17.3.1, cors ^2.8.6
- [ ] Scripts: `start`, `dev` (node --watch), `migrate`, `seed`
- [ ] `.env` con PORT=3001, MONGODB_URI, MYSQL_*
- [ ] `server.js` con Express + CORS + JSON parser + rutas montadas en /api/catalog
- [ ] `npm start` logea "Servicio MongoDB corriendo en puerto 3001"

---

### TASK-2: Configuración de conexión MongoDB (Mongoose)
**Archivos**: `Backend/mongodb-service/config/db.js` (crear)
**Dependencias**: TASK-1
**Esfuerzo**: Pequeño

**Criterios de aceptación**:
- [ ] `connectDB()` async con mongoose.connect()
- [ ] Pool: maxPoolSize=10, minPoolSize=2, serverSelectionTimeoutMS=5000
- [ ] Eventos: 'error', 'disconnected'
- [ ] Graceful shutdown con SIGINT
- [ ] Hasta 3 reintentos con 2s de delay
- [ ] `getConnectionStatus()` que retorna readyState

---

## Group 2: Mongoose Models

### TASK-3: Modelo Artista
**Archivos**: `Backend/mongodb-service/models/Artista.js` (crear)
**Dependencias**: TASK-2
**Esfuerzo**: Pequeño

**Criterios de aceptación**:
- [ ] Schema: nombre (required, trim), apellido, biografia, fecha_nacimiento, nacionalidad, fotos ([String]), porcentaje_ganancia (Decimal128), generos_artisticos ([String]), comentario
- [ ] Índices: { nombre: 1, apellido: 1 }, { nacionalidad: 1 }
- [ ] Virtual `nombreCompleto`

---

### TASK-4: Modelo Obra base + 5 discriminators
**Archivos**: `Backend/mongodb-service/models/Obra.js` (crear)
**Dependencias**: TASK-3
**Esfuerzo**: Grande

**Criterios de aceptación**:
- [ ] Schema base: nombre, codigo_inventario (unique), artista_id (ref Artista), artista (subdocumento embebido), genero (enum, discriminatorKey), epoca (subdoc), precio_venta (required), alto, ancho, fecha_creacion, estado (enum, default Disponible), fotos ([String]), descripcion, obra_id_original
- [ ] 5 discriminators: Pintura, Escultura, Orfebrería, Cerámica, Fotografía
- [ ] Cada discriminator agrega los campos específicos en `detalles`
- [ ] Modelo exportado es Obra (base)

---

### TASK-5: Definiciones de índices
**Archivos**: `Backend/mongodb-service/models/Obra.js` (modificar)
**Dependencias**: TASK-4
**Esfuerzo**: Pequeño

**Criterios de aceptación**:
- [ ] { genero: 1, precio_venta: 1 }
- [ ] { estado: 1, precio_venta: 1 }
- [ ] { nombre: "text", descripcion: "text" } (text index)
- [ ] { codigo_inventario: 1 } (único)
- [ ] { obra_id_original: 1 } (único)
- [ ] Todos con background: true

---

## Group 3: API Layer

### TASK-6: GET /api/catalog - listado con filtros + paginación $facet
**Archivos**: `routes/catalog.routes.js` (crear), `controllers/catalog.controller.js` (crear - getCatalog)
**Dependencias**: TASK-5
**Esfuerzo**: Grande

**Criterios de aceptación**:
- [ ] Query params: genero, precio_min, precio_max, estado, page (default 1), limit (default 10)
- [ ] $match dinámico según filtros presentes
- [ ] Paginación con $facet: metadata + data
- [ ] Response: `{ success: true, data: [...], total: N, page: N, limit: N }`

---

### TASK-7: GET /api/catalog/:id - detalle con resolución dual de ID
**Archivos**: `controllers/catalog.controller.js` (modificar - getCatalogById)
**Dependencias**: TASK-5
**Esfuerzo**: Medio

**Criterios de aceptación**:
- [ ] Resuelve ID como ObjectId (24 hex) o como obra_id_original (numérico)
- [ ] $lookup a artistas para datos completos
- [ ] Response incluye detalles específicos del género

---

### TASK-8: GET /api/catalog/search - búsqueda full-text con ranking
**Archivos**: `controllers/catalog.controller.js` (modificar - searchCatalog)
**Dependencias**: TASK-5
**Esfuerzo**: Medio

**Criterios de aceptación**:
- [ ] Query params: q (required), genero, precio_min, precio_max
- [ ] $text search con $meta textScore
- [ ] Sort por relevancia, limit 20
- [ ] 400 si q falta o es < 2 caracteres

---

### TASK-9: GET /api/catalog/health - health check
**Archivos**: `controllers/catalog.controller.js` (modificar - healthCheck)
**Dependencias**: TASK-2
**Esfuerzo**: Pequeño

**Criterios de aceptación**:
- [ ] 200 { status: "ok", mongodb: "connected" } si readyState = 1
- [ ] 503 { status: "error", mongodb: "disconnected" } si no
- [ ] Cache-Control: no-cache
- [ ] Sin autenticación

---

## Group 4: Middleware & Error Handling

### TASK-10: Global error handler middleware
**Archivos**: `middleware/errorHandler.js` (crear)
**Dependencias**: TASK-1
**Esfuerzo**: Pequeño

**Criterios de aceptación**:
- [ ] ValidationError → 400
- [ ] CastError (ObjectId inválido) → 400
- [ ] Duplicate key (11000) → 409
- [ ] Custom 404 → 404
- [ ] Default → 500

---

### TASK-11: Validation middleware para query params
**Archivos**: `middleware/validation.js` (crear)
**Dependencias**: TASK-1
**Esfuerzo**: Pequeño

**Criterios de aceptación**:
- [ ] validateCatalogQuery: page, limit, genero, precio_min/precio_max, estado
- [ ] validateSearchQuery: q (required), + mismos filtros
- [ ] 400 con mensaje descriptivo en cada fallo

---

## Group 5: ETL & Seed

### TASK-12: Script ETL (migrate.js)
**Archivos**: `scripts/migrate.js` (crear)
**Dependencias**: TASK-3, TASK-4, TASK-5
**Esfuerzo**: Grande

**Criterios de aceptación**:
- [ ] Conecta MySQL + MongoDB
- [ ] Fase 1: Migra artistas con mapeo foto → URL (batches de 100)
- [ ] Fase 2: Migra obras con JOIN por género (batches de 100)
- [ ] Fase 3: Crea índices
- [ ] Fase 4: Verifica conteos
- [ ] Idempotente (--force dropea colecciones)

---

### TASK-13: Script Seed (seed.js)
**Archivos**: `scripts/seed.js` (crear)
**Dependencias**: TASK-5
**Esfuerzo**: Medio

**Criterios de aceptación**:
- [ ] 3 artistas + 5 obras (1 por género)
- [ ] Obras con detalles específicos del género
- [ ] Sin dependencia de MySQL
- [ ] Ejecutable con `npm run seed`

---

## Group 6: Frontend Integration

### TASK-14: Feature flag en auth.js
**Archivos**: `Frontend/js/auth.js` (modificar)
**Dependencias**: TASK-9
**Esfuerzo**: Pequeño

**Criterios de aceptación**:
- [ ] isMongoDBAvailable() con health check + cache 5 min
- [ ] getCatalogBaseURL() retorna MongoDB URL o API_BASE
- [ ] 3s timeout en health check

---

### TASK-15: Adaptar catálogo (index.html) a MongoDB
**Archivos**: `Frontend/pages/index.html` (modificar)
**Dependencias**: TASK-14, TASK-6, TASK-8
**Esfuerzo**: Medio

**Criterios de aceptación**:
- [ ] cargarObras() usa getCatalogBaseURL()
- [ ] Adapta campos: artista.nombre → artista_nombre, genero → genero_nombre
- [ ] Imágenes siempre del monolito (port 3000)
- [ ] Fallback graceful si MongoDB no responde

---

### TASK-16: Adaptar detalle (detalle.html) a MongoDB
**Archivos**: `Frontend/pages/Principal/detalle.html` (modificar)
**Dependencias**: TASK-14, TASK-7
**Esfuerzo**: Medio

**Criterios de aceptación**:
- [ ] cargarObra() usa getCatalogBaseURL()
- [ ] Adapta campos igual que index.html
- [ ] detalles polimórficos se renderizan correctamente
- [ ] Fallback graceful

---

## Group 7: Testing

### TASK-17: Smoke test script (curl)
**Archivos**: `docs/smoke-test-sprint1.sh` (crear)
**Dependencias**: TODAS las anteriores
**Esfuerzo**: Pequeño

**Criterios de aceptación**:
- [ ] Health test → 200
- [ ] List all → 200 con data + total
- [ ] Filter by genre → 200, solo ese género
- [ ] Filter by price → 200, precios en rango
- [ ] Combined filters → 200
- [ ] Pagination → page, limit correctos
- [ ] Detail by ObjectId → 200 con detalles
- [ ] Detail by numeric ID → 200
- [ ] Search → 200 con relevancia
- [ ] Validation error → 400
- [ ] Not found → 404

---

## Resumen de Archivos a Crear/Modificar

### Nuevos (en Backend/mongodb-service/)
| Archivo | Tarea |
|---------|-------|
| package.json | TASK-1 |
| .env | TASK-1 |
| .gitignore | TASK-1 |
| server.js | TASK-1 |
| config/db.js | TASK-2 |
| models/Artista.js | TASK-3 |
| models/Obra.js | TASK-4, TASK-5 |
| routes/catalog.routes.js | TASK-6 |
| controllers/catalog.controller.js | TASK-6, TASK-7, TASK-8, TASK-9 |
| middleware/errorHandler.js | TASK-10 |
| middleware/validation.js | TASK-11 |
| scripts/migrate.js | TASK-12 |
| scripts/seed.js | TASK-13 |

### Modificados (Frontend)
| Archivo | Tarea |
|---------|-------|
| Frontend/js/auth.js | TASK-14 |
| Frontend/pages/index.html | TASK-15 |
| Frontend/pages/Principal/detalle.html | TASK-16 |

### Nuevos (documentación)
| Archivo | Tarea |
|---------|-------|
| docs/smoke-test-sprint1.sh | TASK-17 |

---

> **Total**: 17 tareas - 4 pequeñas, 4 medianas, 3 grandes (models, API, ETL) + frontend + testing
