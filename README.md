# 🏛️ Museo — Sistema de Gestión de Catálogo Museístico

Sistema de gestión museística con **arquitectura políglota** desarrollado como proyecto para la materia **Bases de Datos II (SBDII)**.

Tres bases de datos conviven para aprovechar las fortalezas de cada una:

| Base de Datos | Rol | Puerto |
|--------------|-----|--------|
| **MySQL / MariaDB** | Sistema transaccional — usuarios, ventas, facturación, multimedia | 3306 |
| **MongoDB** | Catálogo dinámico — obras polimórficas con 5 géneros, búsqueda textual | 27017 |
| **Apache Cassandra** | Auditoría — eventos, resúmenes contadores con particionado por mes | 9042 |

Cada base tiene su propio microservicio Express 5 que expone API REST, y un monolito central orquesta todo via proxies.

---

## 📋 Requerimientos del Sistema

### Backend MySQL (Monolito — puerto 3000)

| Requisito | Versión Mínima | Recomendado |
|-----------|---------------|-------------|
| Node.js | 18.x | 22.x+ |
| MySQL / MariaDB | MySQL 8.0 / MariaDB 10.5 | MariaDB 11.x |
| npm | 9.x | 10.x+ |

### Microservicio MongoDB (puerto 3001)

| Requisito | Versión Mínima | Recomendado |
|-----------|---------------|-------------|
| Node.js | 18.x | 22.x+ |
| MongoDB | 7.x | 8.2.7+ |
| npm | 9.x | 10.x+ |

### Microservicio Cassandra (puerto 3002)

| Requisito | Versión Mínima | Recomendado |
|-----------|---------------|-------------|
| Node.js | 18.x | 22.x+ |
| Apache Cassandra | 4.x | 5.0.8+ |
| npm | 9.x | 10.x+ |

### Frontend

- Navegador web moderno (Chrome, Firefox, Edge)
- Sin dependencias de build — HTML + CSS + JavaScript vanilla
- Se sirve desde el propio backend Express (estático)

---

## 📁 Estructura del Proyecto

```
dev_BD_Museo/
├── Backend/                          # ★ Backend principal (Express 5)
│   ├── app.js                        # Entry point — orquesta todo
│   ├── package.json                  # Dependencias del monolito
│   ├── .env                          # Variables de entorno
│   ├── config/
│   │   └── database.js               # Pool MySQL2 (10 conexiones)
│   ├── routes/                       # Rutas del monolito
│   │   ├── catalogo.routes.js        # Proxy → mongodb-service (3001)
│   │   ├── multimedia.routes.js      # Sirve fotos desde MySQL
│   │   ├── eventos.routes.js         # Proxy → cassandra-service (3002)
│   │   ├── Compra/                   # ventas.js, reportes.js, upload.js
│   │   └── Usuario/                  # usuarios.js, preguntas.js
│   ├── controllers/                  # CRUD de MySQL: Usuario, Compra, etc.
│   ├── services/
│   │   ├── catalogProxy.js           # Axios proxy → mongodb-service
│   │   ├── eventosProxy.js           # Axios proxy → cassandra-service
│   │   ├── multimediaHelper.js       # CRUD fotos en MySQL (Multimedia)
│   │   └── auditoriaHelper.js        # Fire-and-forget a Cassandra
│   ├── middlewares/
│   │   └── uploadMemory.js           # Multer memoryStorage (10MB)
│   ├── shared/
│   │   ├── auth.js                   # JWT auth canónico
│   │   ├── sslContext.js             # Session Context Layer
│   │   ├── sslLogger.js              # Logger estructurado SSL
│   │   └── sslMiddleware.js          # Middleware SSL Express
│   ├── utils/
│   │   └── genericController.js      # Factory CRUD para tablas catálogo MySQL
│   └── scripts/
│       ├── setup-dev.js              # Pobla MySQL con datos de desarrollo
│       └── sql/
│           ├── schema.sql            # Schema completo MySQL (~30 tablas)
│           ├── seed.sql              # Datos de prueba
│           ├── genero.sql            # Géneros artísticos
│           └── clean.sql             # TRUNCATE + reinicio AUTO_INCREMENT
│
├── Backend/mongodb-service/          # ★ Microservicio MongoDB (puerto 3001)
│   ├── server.js                     # Entry point
│   ├── package.json
│   ├── config/db.js                  # Conexión Mongoose (pool 2-10, retry 3)
│   ├── models/
│   │   ├── Artista.js                # Schema artista con índices
│   │   ├── Obra.js                   # Schema + 5 discriminadores polimórficos
│   │   └── Genero.js                 # Schema género artístico
│   ├── controllers/
│   │   ├── catalog.controller.js     # Aggregation Framework + CRUD obras
│   │   ├── artist.controller.js      # CRUD artistas
│   │   └── genero.controller.js      # CRUD géneros
│   ├── routes/
│   │   └── catalog.routes.js         # Rutas unificadas del catálogo
│   ├── middleware/
│   │   ├── auth.js                   # JWT + Internal Key auth
│   │   ├── validation.js             # Validación de queries
│   │   └── errorHandler.js           # Manejador global de errores
│   ├── utils/
│   │   ├── fieldMapper.js            # Decimal128 → Number + resolución de nombres
│   │   └── decimalHelper.js          # Conversión recursiva Decimal128
│   └── scripts/
│       ├── seed.js                   # Poblado sin dependencia MySQL
│       └── migrate.js                # ETL: MySQL → MongoDB (batch 100)
│
├── Backend/cassandra-service/        # ★ Microservicio Cassandra (puerto 3002)
│   ├── server.js                     # Entry point
│   ├── package.json
│   ├── config/cassandra.js           # Cliente cassandra-driver
│   ├── init-db.js                    # Crea keyspace + tablas desde schema.cql
│   ├── models/
│   │   ├── eventos.js                # CRUD eventos_auditoria
│   │   └── resumenes.js              # CRUD resumen_eventos (counter table)
│   ├── controllers/
│   │   └── auditoria.controller.js   # createEvent, getEvents, getReports
│   ├── routes/
│   │   └── auditoria.routes.js       # POST/GET eventos, GET reportes, GET health
│   ├── middleware/
│   │   ├── auth.js                   # JWT + Internal Key auth
│   │   └── errorHandler.js           # Manejador con CassandraError
│   └── scripts/
│       └── schema.cql                # CQL: keyspace + 2 tablas
│
├── Frontend/                         # ★ Frontend Vanilla (21 páginas)
│   ├── pages/
│   │   ├── index.html                # Catálogo público con filtros
│   │   ├── Principal/                # detalle, artista, login, registro, confirmar-compra
│   │   ├── Administrador/            # dashboard, CRUDs, facturación, consultas, auditoría
│   │   └── Perfiles/                 # perfil, membresía, recuperar password
│   └── js/
│       └── auth.js                   # Helpers de autenticación + API_BASE
│
├── docs/                             # ★ Documentación académica
│   ├── propuesta-global-sprint1-mongodb.md
│   ├── diseno-tecnico-sprint1-mongodb.md
│   ├── diseno-blindaje-npm-sprint1.md
│   ├── tareas-sprint1-mongodb.md
│   ├── registro-cambios-sprint1.md
│   ├── smoke-test-sprint1.sh
│   ├── defensa-academica-mongodb.md
│   └── decisiones/
│
├── Backend/cassandra/                # Binarios de Apache Cassandra 5.0.8
│   ├── bin/                          # cassandra, cqlsh, nodetool
│   ├── conf/                         # cassandra.yaml, cassandra-env.sh
│   └── data/                         # Data directory (WiredTiger-style)
│
└── README.md
```

---

## 🚀 Cómo Ejecutar el Proyecto

### 1. Pre-requisitos

```bash
# Node.js + npm
node --version   # ≥ 18.x
npm --version    # ≥ 9.x

# MySQL / MariaDB
mysql --version  # MariaDB 11.x o MySQL 8.x

# MongoDB
mongod --version # ≥ 7.x (recomendado 8.2.7+)

# Apache Cassandra
cassandra -v     # 5.0.8+
```

### 2. Base de Datos MySQL

```bash
# Crear la base de datos
mysql -u root -e "CREATE DATABASE IF NOT EXISTS test_bodega_museo;"

# Ejecutar schema, seed y géneros
mysql -u root test_bodega_museo < Backend/scripts/sql/schema.sql
mysql -u root test_bodega_museo < Backend/scripts/sql/seed.sql
mysql -u root test_bodega_museo < Backend/scripts/sql/genero.sql
```

> Si usás MariaDB con `unix_socket` para root, conectate con tu usuario de sistema sin contraseña.

### 3. Backend MySQL (Monolito)

```bash
cd Backend

# Instalar dependencias
npm install

# Verificar que no haya vulnerabilidades críticas
npm audit

# Iniciar el servidor (SIEMPRE desde Backend/ — dotenv resuelve .env relativo al CWD)
node app.js
```

El servidor arranca en **http://localhost:3000**.

### 4. Cassandra + Microservicio de Auditoría

```bash
# 4a. Arrancar Cassandra
# (requiere Java 11+)
cd Backend/cassandra
./bin/cassandra -f

# 4b. Inicializar keyspace y tablas
cd ../cassandra-service
node init-db.js

# 4c. Iniciar microservicio
node server.js
```

El microservicio de auditoría arranca en **http://localhost:3002**.

### 5. MongoDB + Microservicio de Catálogo

```bash
# 5a. Arrancar MongoDB (con data dir aislado para evitar corrupción WiredTiger)
mongod --dbpath Backend/mongodb-service/data \
       --logpath Backend/mongodb-service/data/mongod.log \
       --fork --port 27017 --nounixsocket

# 5b. Iniciar microservicio
cd Backend/mongodb-service
npm install
node server.js
```

El microservicio de catálogo arranca en **http://localhost:3001**.

### 6. Poblar datos de prueba

```bash
# Opción A: Seed básico para MongoDB (3 artistas + 5 obras)
cd Backend/mongodb-service
node scripts/seed.js

# Opción B: Migración desde MySQL (si ya tenés datos en MySQL)
node scripts/migrate.js

# Opción C: Setup de desarrollo MySQL (admin + artistas + obras)
cd Backend
node scripts/setup-dev.js
```

### 7. Frontend

El frontend se sirve automáticamente desde el backend en `http://localhost:3000`. También podés servirlo standalone:

```bash
# Con Python
python3 -m http.server 8080 -d Frontend/pages/

# Con Node
npx http-server Frontend/pages/ -p 8080
```

### 8. Verificar que todo funciona

```bash
# Smoke test del microservicio MongoDB (requiere puerto 3001)
bash docs/smoke-test-sprint1.sh

# Smoke test del servicio Cassandra
cd Backend/cassandra-service
bash test-smoke.sh
```

---

## 🔧 Stack Tecnológico

### Backend MySQL (Monolito)

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | 22.x+ | Runtime |
| Express | 5.x | Framework HTTP |
| MySQL2 | 3.x | Driver MySQL con pool de conexiones |
| jsonwebtoken | 9.x | Autenticación JWT |
| bcrypt | 6.x | Hashing de contraseñas |
| multer | 2.x | Upload de archivos (memoryStorage 10MB) |
| cors | 2.x | Cross-Origin Resource Sharing |
| dotenv | 17.x | Variables de entorno |
| axios | 1.x | HTTP client para proxies service-to-service |
| uuid | 14.x | Generación de UUIDs |

### Microservicio MongoDB

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | 22.x+ | Runtime |
| Express | 5.x | Framework HTTP |
| Mongoose | 9.6.1 | ODM con discriminadores polimórficos |
| MongoDB | 8.2.7 | Base de datos documental |
| dotenv | 17.x | Variables de entorno |

### Microservicio Cassandra

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | 22.x+ | Runtime |
| Express | 5.x | Framework HTTP |
| cassandra-driver | 4.x | Driver nativo de Apache Cassandra |
| Apache Cassandra | 5.0.8 | Base de datos distribuida |
| jsonwebtoken | 9.x | Validación JWT |
| axios | 1.x | Health check interno |

### Frontend

HTML5 + CSS3 + JavaScript vanilla (sin frameworks). Comunicación con los backends via `fetch()`.

---

## 📡 API Reference

### Backend MySQL — Endpoints Directos (puerto 3000)

#### Usuarios (`/api/usuarios`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/usuarios/registro` | — | Registrar nuevo usuario |
| POST | `/api/usuarios/login` | — | Iniciar sesión (retorna JWT) |
| GET | `/api/usuarios/preguntas-de/:email` | — | Obtener preguntas de seguridad de un email |
| POST | `/api/usuarios/recuperar-password-externo` | — | Recuperar contraseña con respuestas |
| GET | `/api/usuarios/perfil` | token | Obtener perfil propio |
| POST | `/api/usuarios/membresia` | token | Pagar membresía |
| POST | `/api/usuarios/seguridad` | token | Guardar respuestas de seguridad |
| GET | `/api/usuarios/mis-preguntas` | token | Obtener mis preguntas de seguridad |
| POST | `/api/usuarios/cambiar-pass-perfil` | token | Cambiar contraseña desde perfil |
| POST | `/api/usuarios/regenerar-codigo` | token | Regenerar código de seguridad |
| POST | `/api/usuarios/actualizar-preguntas` | token | Actualizar preguntas de seguridad |
| GET | `/api/usuarios` | admin | Listar todos los usuarios |
| GET | `/api/usuarios/:id` | admin | Obtener usuario por ID |
| POST | `/api/usuarios/admin` | admin | Registrar un administrador |
| PUT | `/api/usuarios/:id` | admin | Actualizar usuario |
| DELETE | `/api/usuarios/:id` | admin | Eliminar usuario |

#### Preguntas de Seguridad (`/api/preguntas-seguridad`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/` | — | Listar todas las preguntas de seguridad |

#### Catálogo (proxy a MongoDB via `/api/catalogo`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/catalogo` | — | Listar obras (filtros: `genero`, `artista_id`, `precio_min/max`, `estado`, `page`, `limit`) |
| GET | `/api/catalogo/search` | — | Búsqueda textual (`q` mínimo 2 caracteres) |
| GET | `/api/catalogo/artistas` | — | Listar artistas |
| GET | `/api/catalogo/artistas/:id` | — | Detalle de artista |
| GET | `/api/catalogo/generos` | — | Listar géneros |
| GET | `/api/catalogo/generos/:id` | — | Detalle de género |
| GET | `/api/catalogo/:id` | — | Detalle de obra (ObjectId o ID numérico) |
| POST | `/api/catalogo/obras` | admin | Crear obra |
| PUT | `/api/catalogo/obras/:id` | admin | Actualizar obra |
| DELETE | `/api/catalogo/obras/:id` | admin | Eliminar obra |
| POST | `/api/catalogo/artistas` | admin | Crear artista |
| PUT | `/api/catalogo/artistas/:id` | admin | Actualizar artista |
| DELETE | `/api/catalogo/artistas/:id` | admin | Eliminar artista |
| POST | `/api/catalogo/generos` | admin | Crear género |
| PUT | `/api/catalogo/generos/:id` | admin | Actualizar género |
| DELETE | `/api/catalogo/generos/:id` | admin | Eliminar género |
| GET | `/api/catalogo/ssl/contexto` | — | Crear contexto SSL |

#### Multimedia (`/api/multimedia`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/:id` | — | Servir foto binaria desde MySQL (cache 1 día) |

#### Eventos (proxy a Cassandra via `/api/eventos`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/eventos` | admin | Listar eventos de auditoría (filtros: `tipo_evento`, `severidad`, `desde`, `hasta`) |
| GET | `/api/eventos/reportes` | admin | Reportes agrupados por fecha y tipo |

#### Ventas (`/api/ventas`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/ventas/reservar` | miembro | Reservar una obra |
| PUT | `/api/ventas/:id/concretar` | admin | Concretar venta |
| PUT | `/api/ventas/:id/cancelar` | admin | Cancelar venta |
| GET | `/api/ventas` | admin | Listar ventas (filtro: `estado`) |
| GET | `/api/ventas/facturas` | admin | Listar facturas |
| GET | `/api/ventas/facturas/:id` | admin | Detalle de factura |

#### Reportes (`/api/reportes`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/reportes/ventas` | admin | Obras vendidas por período |
| GET | `/api/reportes/facturacion` | admin | Resumen de facturación |
| GET | `/api/reportes/membresias` | admin | Resumen de membresías |

#### Upload (`/api/upload`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/upload` | admin | Subir imagen (multipart/form-data) |

### Microservicio MongoDB (puerto 3001)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/catalog/health` | — | Health check |
| GET | `/api/catalog` | opcional | Listar obras con filtros + paginación (`$facet`) |
| GET | `/api/catalog/search` | opcional | Búsqueda textual (`$text` + `textScore`) |
| GET | `/api/catalog/ssl/contexto` | — | Crear contexto SSL |
| GET | `/api/catalog/:id` | opcional | Detalle de obra (ObjectId o numérico) |
| POST | `/api/catalog` | admin | Crear obra |
| PUT | `/api/catalog/:id` | admin | Actualizar obra |
| DELETE | `/api/catalog/:id` | admin | Eliminar obra |
| GET | `/api/catalog/artists` | opcional | Listar artistas |
| GET | `/api/catalog/artists/:id` | opcional | Detalle de artista |
| POST | `/api/catalog/artists` | admin | Crear artista |
| PUT | `/api/catalog/artists/:id` | admin | Actualizar artista |
| DELETE | `/api/catalog/artists/:id` | admin | Eliminar artista |
| GET | `/api/catalog/generos` | opcional | Listar géneros |
| GET | `/api/catalog/generos/:id` | opcional | Detalle de género |
| POST | `/api/catalog/generos` | admin | Crear género |
| PUT | `/api/catalog/generos/:id` | admin | Actualizar género |
| DELETE | `/api/catalog/generos/:id` | admin | Eliminar género |

### Microservicio Cassandra (puerto 3002)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/auditoria/health` | — | Health check |
| POST | `/api/auditoria/eventos` | token | Registrar evento de auditoría |
| GET | `/api/auditoria/eventos` | admin | Listar eventos (filtros: `tipo_evento`, `desde`, `hasta`, `limite`) |
| GET | `/api/auditoria/reportes` | admin | Reportes agrupados por fecha y tipo |

---

## 🧠 Arquitectura

### Arquitectura Políglota

```
                    ┌──────────────────────────────────────┐
                    │          Frontend (Vanilla JS)        │
                    │         http://localhost:3000          │
                    └──────────┬───────────────────────────-┘
                               │
                    ┌──────────▼───────────────────────────-┐
                    │      Backend MySQL (Express 5)        │
                    │         http://localhost:3000          │
                    │                                       │
                    │  /api/usuarios     → MySQL directo     │
                    │  /api/ventas       → MySQL directo     │
                    │  /api/multimedia   → MySQL directo     │
                    │  /api/catalogo/*   → proxy :3001       │
                    │  /api/eventos/*    → proxy :3002       │
                    └───────┬──────────────────┬────────────-┘
                            │                  │
              ┌─────────────▼──────┐    ┌──────▼──────────────┐
              │  mongodb-service   │    │  cassandra-service  │
              │   :3001            │    │   :3002             │
              │   Express +        │    │   Express +         │
              │   Mongoose 9       │    │   cassandra-driver  │
              │                    │    │                     │
              │   MongoDB 8.2.7    │    │   Cassandra 5.0.8   │
              │   (catálogo)       │    │   (auditoría)       │
              └────────────────────┘    └─────────────────────┘
```

### Autenticación Service-to-Service

```
Cliente → JWT Bearer → Monolito (valida JWT + verifica admin)
                         ↓
                   x-internal-key → mongodb-service (confía en internal key)
                   x-internal-key → cassandra-service (confía en internal key)
```

Los tres servicios comparten el mismo `JWT_SECRET` e `INTERNAL_API_KEY`. La `INTERNAL_API_KEY` se pasa en header `x-internal-key` y crea un usuario virtual `{ tipo: 'sistema' }` que salta la validación JWT.

### Diseño de Colecciones MongoDB

**2 colecciones** reemplazan ~20 tablas MySQL:

- **`artistas`**: nombre, apellido, biografía, fecha_nacimiento, nacionalidad, `fotos[]`, `porcentaje_ganancia`, `generos_artisticos[]`
- **`obras`**: Campos comunes + discriminador por género + artista embebido (lectura) + `artista_id` referenciado (escritura)

**5 discriminadores polimórficos** (Mongoose):

| Género | Campos específicos en `detalles` |
|--------|----------------------------------|
| `Pintura` | soporte, estilos[], temáticas[] |
| `Escultura` | peso, profundidad, tipo_escultura, materiales[], tecnicas[] |
| `Orfebrería` | profundidad, diámetro, peso, pieza, metal_predominante, metales[] |
| `Cerámica` | profundidad, diámetro, funcionalidad, cocción, arcilla, modelado, esmaltado |
| `Fotografía` | tiraje, obturacion, apertura, iso, resolución, fecha_captura, impresión, cámara, tecnica_fotografica |

### Diseño de Tablas Cassandra

```cql
-- Particionado por mes para consultas eficientes por rango de tiempo
CREATE TABLE eventos_auditoria (
    mes TEXT,
    timestamp TIMESTAMP,
    id TIMEUUID,
    tipo_evento TEXT,
    usuario TEXT,
    severidad TEXT,
    metadata TEXT,
    ip TEXT,
    PRIMARY KEY ((mes), timestamp, id)
) WITH CLUSTERING ORDER BY (timestamp DESC, id DESC);

-- Tabla contador para resúmenes rápidos
CREATE TABLE resumen_eventos (
    tipo_evento TEXT,
    fecha DATE,
    total COUNTER,
    PRIMARY KEY ((tipo_evento), fecha)
) WITH CLUSTERING ORDER BY (fecha DESC);
```

---

## 🧪 Cobertura de Pruebas

| Tipo | Framework | Estado | Descripción |
|------|-----------|--------|-------------|
| Smoke test MongoDB | Bash + curl + jq | 21/21 ✅ | Health, CRUD, filtros, búsqueda, validación |
| Smoke test Cassandra | Bash + curl | 11/11 ✅ | Health, eventos, auth, validación |
| Tests unitarios | — | ❌ | No implementado |
| Tests de integración | — | ❌ | No implementado |

### Endpoints cubiertos por smoke tests

**MongoDB (`docs/smoke-test-sprint1.sh`):**
- ✅ Health check
- ✅ Listado con paginación
- ✅ Filtro por género
- ✅ Filtro por precio (min/max)
- ✅ Filtro por disponibilidad
- ✅ Búsqueda `$text`
- ✅ Detalle por ObjectId
- ✅ Detalle por ID numérico
- ✅ Validación de errores (400)
- ✅ Not Found (404)

**Cassandra (`Backend/cassandra-service/test-smoke.sh`):**
- ✅ Health check sin auth
- ✅ POST evento sin token (401)
- ✅ POST con token (201)
- ✅ Validaciones (400)
- ✅ GET eventos con admin
- ✅ GET reportes con admin
- ✅ Validación de fecha obligatoria (400)

---

## ✅ Bugs Encontrados y Corregidos

### Sprint 2 — Cassandra + Refactor MongoDB

| # | Bug | Severidad | Archivos | Fix |
|---|-----|-----------|----------|-----|
| 1 | CRUD de obras/artistas/géneros sin autenticación | 🔴 Crítico | 17 rutas en `catalogo.routes.js` | Se agregó middleware `verificarAdmin` a todas las rutas POST/PUT/DELETE |
| 2 | `dotenv` no resuelve `.env` cuando se ejecuta desde otro directorio | 🔴 Crítico | `app.js`, `config/database.js`, `server.js` | Cambiado a `path.resolve(__dirname, '.env')` |
| 3 | `.env.example` desactualizado — faltaban `JWT_SECRET` e `INTERNAL_API_KEY` | 🟡 Medio | `.env.example` | Agregadas todas las variables necesarias |
| 4 | Contraseña hardcodeada en `export.py` | 🟡 Medio | `export.py` | Migrado a `os.getenv()` |
| 5 | `museo_completo.json` trackeado por git (datos sensibles) | 🟢 Leve | `.gitignore` | Agregado al `.gitignore` |
| 6 | `authMiddleware.js` duplicado entre servicios | 🟡 Medio | 3 servicios | Refactor: `shared/auth.js` canónico, alias de retrocompatibilidad |
| 7 | Eventos Cassandra respondían sin wrapper `{success, data}` | 🔴 Crítico | `eventosProxy.js`, `eventos.routes.js` | Se agregó wrapper consistente en todas las respuestas |
| 8 | `artista_id` en MongoDB llegaba como string pero frontend esperaba `{$oid: ...}` | 🟡 Medio | `index.html`, `detalle.html`, `fieldMapper.js` | Simplificado a string directo + conditional artist link |
| 9 | Fotos de obras en `index.html` apuntaban a ruta MySQL antigua | 🟡 Medio | `index.html` | Cambiado a `obra.fotos[0]` con fallback a placeholder |
| 10 | Link a artista en tarjetas sin artista mostraba `id=undefined` | 🟡 Medio | `index.html`, `detalle.html` | Link condicional si `artista_id` existe, sino "Desconocido" sin link |
| 11 | `porcentaje_ganancia` se mostraba en la biografía pública del artista | 🟢 Leve | `artista.html` | Línea eliminada del HTML de perfil público |

### Sprint 1 — MongoDB

| # | Bug | Severidad | Solución |
|---|-----|-----------|----------|
| 12 | MongoDB SEGV (Signal 11) por corrupción WiredTiger | 🔴 Crítico | Data dir aislado + `--nounixsocket` |
| 13 | `dotenv` no cargado en `server.js` del microservicio | 🔴 Crítico | Agregado `require('dotenv').config()` al inicio |
| 14 | Duplicate key en índices `unique` | 🟡 Medio | `sparse: true` en índices opcionales |
| 15 | Discriminadores no compilaban en `seed.js` | 🟡 Medio | Usar `mongoose.model(obra.genero)` en vez de constructor directo |
| 16 | Artista no importado en `seed.js` | 🟡 Medio | Agregado `require('../models/Artista')` |
| 17 | Backend respondía 500 sin `.env` | 🔴 Crítico | Mensaje de error claro si falta `.env` |

---

## ✅ Qué Hace el Proyecto

- **Gestión de catálogo**: CRUD completo de obras de arte con 5 géneros (Pintura, Escultura, Fotografía, Cerámica, Orfebrería), cada uno con sus atributos específicos
- **Gestión de artistas**: CRUD con foto, biografía, géneros artísticos, porcentaje de ganancia
- **Gestión de géneros**: CRUD de categorías artísticas
- **Catálogo público**: Listado con filtros por género, artista, precio y estado. Búsqueda textual con índices `$text` de MongoDB
- **Autenticación**: Registro, login JWT, roles (usuario/miembro/administrador), recuperación de contraseña con preguntas de seguridad
- **Membresías**: Activación de membresía con preguntas de seguridad, código de seguridad para compras
- **Ventas**: Reserva de obra, confirmación con dirección de envío, cancelación, generación de factura con IVA 16%
- **Auditoría**: Registro de eventos (login, compras, modificaciones, errores) con severidad, consulta paginada con filtros, reportes agrupados por fecha
- **Multimedia**: Upload y servir de fotos (obras y artistas) desde MySQL (MEDIUMBLOB)
- **SSL Context Layer**: Seguimiento de sesiones de navegación anónimas con contexto en memoria
- **Panel administrador**: Dashboard con CRUDs de obras, artistas, géneros, usuarios; gestión de reservas y facturas; consultas de ventas, facturación y membresías
- **Arquitectura service-to-service**: Comunicación entre microservicios via internal API key

## ❌ Qué NO Hace el Proyecto (Limitaciones Conocidas)

- **Sin tests unitarios ni de integración**: Solo smoke tests bash
- **CRUD MySQL sin auth**: Las rutas POST/PUT/DELETE de la capa MySQL (no proxy) heredadas del monolito original no tienen middleware de autenticación. Solo compras y facturación tienen `verificarToken`
- **Dependencia del CWD**: El monolito debe ejecutarse desde `Backend/` porque `dotenv` resuelve `.env` relativo al CWD (parcialmente corregido con `path.resolve(__dirname, ...)` en algunos archivos)
- **Búsqueda `$text` con acentos**: La búsqueda por "Dalí" no encuentra resultados (el text index tokeniza caracteres acentuados de forma distinta). Usar términos sin acentos ("Dali")
- **Sin WebSockets**: Toda la comunicación es request-response via REST. No hay notificaciones en tiempo real
- **Sin caché distribuida**: El SSL context se guarda en memoria del proceso (no Redis/Memcached)
- **Frontend sin framework**: 21 páginas HTML con JavaScript vanilla. No hay componentización, router, ni estado global
- **Sin HTTPS en desarrollo**: Todo corre sobre HTTP plano
- **Manejo de fotos en MySQL**: Las imágenes se guardan como MEDIUMBLOB en MySQL en vez de en disco/S3. Escala mal para muchas imágenes
- **Seed de artistas MySQL vacío**: La tabla Artistas en MySQL no tiene datos iniciales. Solo hay géneros y un usuario admin
- **Pantallas responsivas limitadas**: El CSS usa media queries básicos pero no está probado en todos los tamaños de pantalla
- **Sin rate limiting**: No hay protección contra ataques de fuerza bruta en login
- **Sin validación de email**: El registro acepta cualquier formato de email

---

## 🧠 Decisiones de Arquitectura Clave

| Decisión | Opción Elegida | Alternativa | Justificación |
|----------|---------------|-------------|---------------|
| **Microservicio vs monolito** | Microservicios independientes por DB | Capa adicional en monolito | Aislamiento de fallas, escalado independiente, demostración de arquitectura distribuida |
| **ODM** | Mongoose 9.6.1 | MongoDB Node.js Driver | Discriminadores polimórficos, validación de schema, middleware pre/post |
| **Diseño colecciones** | 2 colecciones: `artistas` + `obras` | Colección única embebida | Consultas independientes, reutilización de artistas |
| **Especialización por género** | Discriminadores polimórficos (5 subtipos) | Schema genérico con campo `tipo` | Type-safety de Mongoose, campos específicos por género |
| **Búsqueda** | `$text` index con `textScore` | Expresiones regulares | Performance, ranking por relevancia, soporte multilingual |
| **Paginación** | `$facet` (1 consulta) | `$count` + `$skip` + `$limit` (2 consultas) | Una sola consulta a MongoDB, atomicidad |
| **Embedding vs Referencias** | Híbrido: artista embebido (lectura) + referenciado (escritura) | Solo referencias | Lecturas O(1) sin populate, escrituras atómicas separadas |
| **IDs** | Resolución dual (ObjectId + numérico) | Solo ObjectId | Compatibilidad con datos migrados de MySQL |
| **Fotos** | URLs (strings) en MongoDB, BLOB en MySQL | BinData (Buffer) en MongoDB | Separación de concerns, MySQL tiene mejor manejo de archivos binarios |
| **Feature flag frontend** | Health check con cache 5 min | Config manual | Auto-detección de disponibilidad del microservicio |
| **Auditoría** | Cassandra con particionado por mes | MySQL table de logs | Escritura rápida, consultas por rango de tiempo eficientes, contadores atómicos |
| **Auth service-to-service** | Internal API Key en header | JWT re-validation | Menos latencia, el monolito ya validó el JWT |

---

## 📜 Convenciones de Código

### Backend (Node.js / Express)

- **Archivos**: `kebab-case.js` para rutas y servicios, `camelCase.js` para módulos compartidos
- **Funciones**: Nombres descriptivos en inglés (`getCatalog`, `createArtist`, `validateSearchQuery`)
- **Controllers**: Funciones async que reciben `(req, res, next)`. La respuesta siempre tiene estructura `{ success: true, data: ... }` o `{ success: false, error: ... }`
- **Errores**: Manejo centralizado via `errorHandler` middleware. Los errores de validación retornan 400, no encontrado 404, conflictos 409, internos 500
- **Proxy**: Los servicios proxy retornan exactamente lo que el microservicio responde, sin transformación adicional
- **Auth**: Middleware `verificarToken`, `verificarAdmin`, `verificarMiembro` en orden. `opcionalAuth` para rutas públicas con funcionalidad extra para usuarios autenticados

### Frontend (Vanilla JS)

- **API_BASE**: Constante global en `auth.js` apuntando a `http://localhost:3000/api`
- **Auth**: Funciones en `auth.js`: `setAuth()`, `getToken()`, `getUser()`, `isLoggedIn()`, `logout()`, `authFetch()`
- **Páginas**: HTML semántico con CSS embebido en `<style>`. JavaScript al final del body
- **Fetch**: Uso de `fetch()` nativo con `async/await`. Las requests autenticadas usan `authFetch()`
- **Errores**: Captura genérica con `try/catch`, mensajes al usuario con `alert()` o elementos del DOM

---

## 📜 Licencia

Proyecto académico — Universidad para Bases de Datos II (SBDII), 2026.
