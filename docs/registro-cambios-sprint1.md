# Registro de Cambios - Sprint 1: Blindaje npm + MongoDB Service

## Contexto

Proyecto museo con backend MySQL (Express 5 + mysql2 + multer), frontend estático
(HTML/JS), y base de datos MariaDB. Se agrega MongoDB como motor de catálogo de
solo-lectura + blindaje de dependencias npm.

---

## Fase 1 - Blindaje npm (Seguridad)

### Cambios
| Archivo | Cambio |
|---------|--------|
| `Backend/package.json` | axios 1.13.6 → 1.16.1, multer 2.1.0 → 2.1.1, mysql2 3.17.2 → 3.22.3 |
| `Backend/package.json` | override `path-to-regexp >= 8.4.0` (CVE en Express 5) |
| `Backend/.npmrc` | `audit-level=high`, `engine-strict=true` |
| `Backend/.gitignore` | `node_modules/`, `.env`, `npm-debug.log*`, `.DS_Store` |

### Por qué
- npm audit reportaba vulnerabilidades altas en dependencias.
- `path-to-regexp` tenía CVE que afectaba a Express 5.
- `.npmrc` bloquea instalación si hay vulnerabilidades high+.

### Errores y solución
Ninguno - actualización directa, `npm install` exitoso, `npm audit` 0 vulnerabilidades.

---

## Fase 2 - MongoDB Service (Sprint 1)

### Cambios estructurales
| Archivo | Propósito |
|---------|-----------|
| `Backend/mongodb-service/server.js` | Entry point Express 5 + Mongoose |
| `Backend/mongodb-service/config/db.js` | Conexión MongoDB |
| `Backend/mongodb-service/models/Artista.js` | Schema artista con índices |
| `Backend/mongodb-service/models/Obra.js` | Schema obra con discriminators por género |
| `Backend/mongodb-service/controllers/catalog.controller.js` | Lógica de negocio (paginación, filtros, search) |
| `Backend/mongodb-service/routes/catalog.routes.js` | Rutas GET (read-only) |
| `Backend/mongodb-service/middleware/validation.js` | Validación de queries |
| `Backend/mongodb-service/middleware/errorHandler.js` | Manejador de errores global |
| `Backend/mongodb-service/scripts/migrate.js` | ETL: MySQL → MongoDB (batch 100) |
| `Backend/mongodb-service/scripts/seed.js` | Datos de ejemplo para desarrollo |
| `Backend/mongodb-service/.env` | Variables de entorno |
| `Backend/mongodb-service/.env.example` | Template |
| `Backend/mongodb-service/.gitignore` | node_modules/, .env, data/ |
| `Backend/mongodb-service/package.json` | Dependencias con blindaje |
| `Frontend/js/auth.js` | Feature flag + `getCatalogBaseURL()` |
| `Frontend/pages/index.html` | Adaptador catálogo MongoDB |
| `Frontend/pages/Principal/detalle.html` | Adaptador detalle MongoDB |

### Decisiones técnicas
| Decisión | Alternativa | Por qué |
|----------|-------------|---------|
| Mongoose ^9.6.1 | ^8.14.0 | CVE-2026-42334 (NoSQL injection) en v8 |
| 5 discriminators (Pintura, Escultura, Fotografía, Cerámica, Orfebrería) | Schema único con field discriminador | Cada género tiene campos específicos, mejor tipado |
| `$facet` para paginación | `countDocuments` + `skip/limit` | Una sola consulta en vez de dos, evita race conditions |
| `$text` search | `$regex` | Indexado, más rápido para búsqueda de texto |
| `sparse: true + unique: true` en índices | `unique: true` simple | Permite null/undefined en seed data sin violar unicidad |

### Errores y soluciones

#### 1. dotenv no cargado en server.js
**Error**: `MONGO_URI is undefined` al iniciar.
**Causa**: `require('dotenv').config()` no estaba en `server.js`.
**Fix**: Se agregó `require('dotenv').config()` al inicio.

#### 2. Artista no importado en seed.js
**Error**: `Artista is not defined` al ejecutar seed.
**Causa**: El modelo `Artista` no estaba requerido en `scripts/seed.js`.
**Fix**: Se agregó `const Artista = require('../models/Artista')`.

#### 3. Duplicate key en índices unique
**Error**: `E11000 duplicate key error` en colección Artista.
**Causa**: Múltiples documentos con `artista_id_original: null` no pueden coexistir con `unique: true`.
**Fix**: Cambiar a `sparse: true` para que null/undefined no sean indexados.

#### 4. Discriminators no compilan en seed
**Error**: `MissingSchemaError: Schema hasn't been registered for model "Pintura"`.
**Causa**: Los discriminators se definen en `Obra.js` pero seed.js usa `Obra.create()` sin que los modelos discriminados estén registrados.
**Fix**: Usar `mongoose.model(obra.genero)` para acceder al discriminador registrado dinámicamente. Mongoose registra automáticamente cada discriminador como modelo, accesible por su nombre de género: `mongoose.model('Pintura')`, `mongoose.model('Escultura')`, etc.

---

## Infraestructura

### Entorno
- SO: EndeavourOS (Arch Linux rolling)
- MariaDB: instalado via `pacman -S mariadb`, `mariadb-install-db --user=mysql --basedir=/usr --datadir=/var/lib/mysql`
- MongoDB: instalado via `yay -S mongodb-bin` (versión 8.2.7, build ubuntu2404)

### Problemas de instalación

#### 1. Instalación MariaDB
No hubo issues. `systemctl enable --now mariadb` funciona out of the box con
socket auth para root.

#### 2. Instalación MongoDB (AUR)
**Error**: `mongod` no se encuentra después de instalar.
**Causa**: El binario se instala en `/usr/bin/mongod` pero el PATH no se actualiza
automáticamente.
**Fix**: `source /etc/profile` o reiniciar shell.

---

## Bugfixes Post-Instalación

### 🔴 CRÍTICO: MongoDB SEGV (Signal 11) en boost::log

**Síntoma**: `systemctl status mongodb` muestra `code=dumped, signal=SEGV`.
`journalctl -u mongodb` muestra stack trace en `boost::log::v2s_mt_posix::attribute_set`.

**Causa raíz**: MongoDB 8.2.7 intenta leer WiredTiger data creada por MongoDB 8.0
en `/var/lib/mongodb/`. Hay corrupción de metadatos que provoca SEGV durante la
inicialización del logging.

**No es**: OOM (7.6GB RAM, 3.2GB libres), ni falta de AVX (CPU lo soporta).

**Fix**:
1. Crear data directory dentro del proyecto: `Backend/mongodb-service/data/`
2. Agregar `data/` a `.gitignore`
3. Arrancar mongod manualmente como usuario luis:
   ```bash
   mongod --dbpath Backend/mongodb-service/data \
          --logpath Backend/mongodb-service/data/mongod.log \
          --fork --port 27017 --nounixsocket
   ```

**Stale socket**: El socket `/tmp/mongodb-27017.sock` del proceso systemd anterior
(owner `mongodb:mongodb`) impedía el arranque manual. **Fix**: flag `--nounixsocket`.

### 🔴 CRÍTICO: .env faltante en Backend/

**Síntoma**: MySQL backend responde 500, log muestra `No database selected`.

**Causa**: No existía `Backend/.env`. Solo había `.env.example` con valores placeholder.

**Fix**: Crear `Backend/.env` con las credenciales correctas para MariaDB.

### 🟡 IMPORTANTE: Password hash inválido en seed.sql

**Síntoma**: Login devuelve "Email o contraseña incorrectos".

**Causa**: El hash en `seed.sql` (`$2b$10$3lOo2xZVfVv0I7qYxY5x9eB8X9X9...`) es un
placeholder, no corresponde a "admin123".

**Fix**: Generar hash real con `bcrypt.hash('admin123', 10)` y actualizar vía:
```sql
UPDATE Usuario SET password='<hash_real>' WHERE email='admin@museo.com';
```

### 🟡 IMPORTANTE: JWT_SECRET faltante

**Síntoma**: Login funciona pero el frontend no puede decodificar el token.

**Causa**: `process.env.JWT_SECRET` no estaba definido en `.env`.

**Fix**: Agregar `JWT_SECRET=dev_secret_museo_2026` al `.env`.

### 🟢 MENOR: MariaDB sin privilegios para crear DB

**Síntoma**: `CREATE DATABASE bodega_museo` falla con `Access denied`.

**Causa**: El usuario `luis` solo tiene privilegios totales en `test_%` databases.
Root usa unix_socket auth (solo accesible via sudo).

**Fix**: Usar `test_bodega_museo` como database name (única alternativa sin sudo).

### 🟢 MENOR: seed.sql referencia database `Museo`

**Síntoma**: `sed '/^USE /d' scripts/sql/seed.sql` necesario para poblado.

**Causa**: seed.sql tiene `USE Museo;` hardcodeado, no coincide con `test_bodega_museo`.

**Fix**: Pipe con `sed` para remover USE, redirigir a la DB correcta.

---

## Estado Final

### Servicios
| Servicio | Puerto | Estado | Comando para arrancar |
|----------|--------|--------|-----------------------|
| MongoDB | 27017 | ✅ Manual | `mongod --dbpath Backend/mongodb-service/data --logpath .../mongod.log --fork --port 27017 --nounixsocket` |
| mongodb-service | 3001 | ✅ Manual | `node server.js` (desde Backend/mongodb-service/) |
| MariaDB | 3306 | ✅ systemd | `systemctl start mariadb` |
| Backend MySQL | 3000 | ✅ Manual | `node app.js` (desde Backend/ con .env presente) |

### Smoke test
```bash
bash docs/smoke-test-sprint1.sh
# Resultado: 21/21 ✅
```

### Datos poblados
- **MongoDB**: 3 artistas, 5 obras (vía `node scripts/seed.js`)
- **MariaDB**: Tablas catálogo + 1 admin (`admin@museo.com` / `admin123`)

### Frontend
- Feature flag en `auth.js`: `isMongoDBAvailable()` detecta MongoDB service
- Catálogo público usa MongoDB (si disponible) para metadatos
- Fotos siempre servidas desde MySQL (`/api/obras/:id/foto`, `/api/artistas/:id/foto`)
- CRUD admin usa MySQL backend siempre
- Login contra MySQL backend (`POST /api/usuarios/login`)

---

## Bugfixes Post-Auditoría (2026-06-04)

| Bug | Archivos | Fix |
|-----|----------|-----|
| CRUD sin auth | shared/authMiddleware.js, 17 rutas, 4 migraciones | Auth unificado en shared/ |
| dotenv path | app.js, database.js, server.js | path.resolve(__dirname) |
| .env.example | .env.example | Actualizado con JWT_SECRET |
| export.py password | export.py | os.getenv() sin hardcode |

---

## Próximos pasos recomendados

1. **Auth en rutas CRUD**: Agregar `verificarToken + verificarAdmin` a artistas/obras
2. **Fotos en MongoDB**: Migrar fotos reales (no placeholders) al migrar de MySQL
3. **POST/PUT/DELETE en MongoDB service**: Para escritura también vía MongoDB
4. **express.static**: Configurar para servir archivos subidos a filesystem
5. **MariaDB user/pass real**: Configurar usuario de aplicación en vez de socket auth
