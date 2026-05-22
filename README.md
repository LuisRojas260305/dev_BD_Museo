# 🏛️ Museo — Sistema de Gestión de Catálogo (BD2)

Sistema de gestión museística desarrollado como proyecto para la materia **Bases de Datos II (SBDII)**. Implementa una arquitectura políglota con **MySQL para el sistema transaccional** y **MongoDB para el catálogo dinámico**, siguiendo un patrón de microservicio independiente.

---

## 📋 Requerimientos del Sistema

### Backend MySQL (Monolito)

| Requisito | Versión Mínima | Recomendado |
|-----------|---------------|-------------|
| Node.js | 18.x | 22.x+ |
| MySQL / MariaDB | MySQL 8.0 / MariaDB 10.5 | MariaDB 11.x |
| npm | 9.x | 10.x+ |

### Microservicio MongoDB (Sprint 1)

| Requisito | Versión Mínima | Recomendado |
|-----------|---------------|-------------|
| Node.js | 18.x | 22.x+ |
| MongoDB | 7.x | 8.2.7+ |
| npm | 9.x | 10.x+ |

### Frontend

- Navegador web moderno (Chrome, Firefox, Edge)
- Sin dependencias de build — HTML + CSS + JavaScript vanilla

---

## 📁 Estructura del Proyecto

```
dev_BD_Museo/
├── Backend/                          # ★ Backend MySQL (Express 5)
│   ├── app.js                        # Entry point — Express 5 server
│   ├── package.json
│   ├── .env                          # Credenciales de base de datos
│   ├── config/
│   │   └── database.js               # Pool MySQL2 (10 conexiones)
│   ├── controllers/                  # 38 controladores CRUD
│   ├── routes/                       # 25 archivos de rutas
│   ├── middlewares/
│   │   ├── auth.js                   # JWT verify (verificarToken, verificarAdmin, verificarMiembro)
│   │   └── uploadMemory.js           # Multer memoryStorage (10MB)
│   ├── services/
│   │   └── obraServices.js           # Lógica de negocio para obras polimórficas
│   ├── utils/
│   │   └── genericController.js      # Factory CRUD para tablas catálogo
│   ├── scripts/sql/
│   │   ├── schema.sql                # Esquema completo de la BD
│   │   ├── seed.sql                  # Datos de prueba
│   │   ├── clean.sql                 # Limpieza de tablas
│   │   └── genero.sql                # Inserción de géneros artísticos
│   └── mongodb-service/              # ★ Microservicio MongoDB (Sprint 1)
│       ├── server.js                 # Entry point — Express 5 + Mongoose
│       ├── package.json
│       ├── .env                      # MongoDB URI + configuración
│       ├── config/
│       │   └── db.js                 # Conexión Mongoose (pool 2-10, retry 3)
│       ├── models/
│       │   ├── Artista.js            # Schema de artista con índices
│       │   └── Obra.js               # Schema + 5 discriminadores polimórficos
│       ├── controllers/
│       │   └── catalog.controller.js # Aggregation Framework (7 pipelines)
│       ├── routes/
│       │   └── catalog.routes.js     # 4 rutas GET con validación
│       ├── middleware/
│       │   ├── validation.js         # Validación de queries
│       │   └── errorHandler.js       # Manejador global de errores
│       ├── scripts/
│       │   ├── seed.js               # Poblado sin dependencia MySQL
│       │   └── migrate.js            # ETL: MySQL → MongoDB (batch 100)
│       ├── utils/
│       │   └── fieldMapper.js        # Transformación Decimal128 → Number
│       └── data/                     # Directorio de datos MongoDB (WiredTiger)
├── Frontend/                         # ★ Frontend Vanilla
│   ├── index.html                    # Catálogo público con feature flag
│   ├── Principal/                    # Páginas principales
│   │   ├── login.html
│   │   ├── registro.html
│   │   ├── detalle.html
│   │   ├── artista.html
│   │   └── confirmar-compra.html
│   ├── Administrador/                # Panel de administración
│   │   ├── admin-dashboard.html
│   │   ├── Consultas/               # 3 páginas de consultas
│   │   ├── Facturacion/             # 2 páginas de facturación
│   │   └── Gestion de datos/        # 4 páginas CRUD
│   ├── Perfiles/                     # Perfiles de usuario
│   │   ├── perfil.html
│   │   ├── membresia.html
│   │   ├── miembro.html
│   │   └── recuperar-password.html
│   └── js/
│       └── auth.js                   # Helpers + feature flag MongoDB
├── docs/                             # ★ Documentación del proyecto
│   ├── propuesta-global-sprint1-mongodb.md
│   ├── diseno-tecnico-sprint1-mongodb.md
│   ├── diseno-blindaje-npm-sprint1.md
│   ├── tareas-sprint1-mongodb.md
│   ├── registro-cambios-sprint1.md
│   ├── smoke-test-sprint1.sh
│   └── decisiones/
│       └── decisiones-clave-sprint1.md
├── Proyecto_Museo_SBDII_Microservicios_09_05_2026_Informatica.pdf
├── X.docx
└── README.md
```

---

## 🚀 Cómo Ejecutar el Proyecto

### 1. Pre-requisitos

Asegurate de tener instalado:

```bash
# Node.js + npm
node --version   # ≥ 18.x
npm --version    # ≥ 9.x

# MySQL / MariaDB
mysql --version  # MariaDB 11.x o MySQL 8.x

# MongoDB
mongod --version # ≥ 7.x (recomendado 8.2.7+)
```

### 2. Base de Datos MySQL

```bash
# Crear la base de datos
mysql -u root -e "CREATE DATABASE IF NOT EXISTS test_bodega_museo;"

# Ejecutar schema y seed
mysql -u root test_bodega_museo < Backend/scripts/sql/schema.sql
mysql -u root test_bodega_museo < Backend/scripts/sql/seed.sql
mysql -u root test_bodega_museo < Backend/scripts/sql/genero.sql
```

> ⚠️ **IMPORTANTE**: Si usás MariaDB con `unix_socket` para root, conectate con tu usuario de sistema sin contraseña.

### 3. Backend MySQL (Monolito)

```bash
cd Backend

# Instalar dependencias
npm install

# IMPORTANTE: ejecutar SIEMPRE desde Backend/
# (dotenv resuelve .env relativo al CWD)
node app.js
```

El servidor arranca en **http://localhost:3000**.

### 4. MongoDB + Microservicio

```bash
# 4a. Arrancar MongoDB
mongod --dbpath Backend/mongodb-service/data \
       --logpath Backend/mongodb-service/data/mongod.log \
       --fork --port 27017 --nounixsocket

# 4b. Iniciar microservicio
cd Backend/mongodb-service
node server.js
```

El microservicio arranca en **http://localhost:3001**.

### 5. Poblar datos de prueba (MongoDB)

```bash
cd Backend/mongodb-service

# Seed básico (3 artistas + 5 obras, 1 por género)
node scripts/seed.js

# O migración desde MySQL (si ya tenés datos en MySQL)
node scripts/migrate.js
```

### 6. Frontend

El frontend es HTML estático. Servilo con cualquier servidor HTTP:

```bash
# Opción A: Con Python
python3 -m http.server 8080 -d Frontend/

# Opción B: Con Node (http-server)
npx http-server Frontend/ -p 8080

# Opción C: Con tu navegador (abrir index.html directamente)
# Algunas funciones (fetch) pueden no funcionar sin servidor
```

Abrí **http://localhost:8080** en tu navegador.

---

## 🧪 Verificación (Smoke Test)

```bash
# Requiere: MongoDB corriendo + microservicio en puerto 3001
bash docs/smoke-test-sprint1.sh
```

Ejecuta 21 tests automatizados contra la API REST del microservicio.

---

## 📡 API Reference

### Backend MySQL (puerto 3000)

Endpoints CRUD estándar para cada entidad del dominio museístico:

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/obras` | — | Listar obras |
| GET | `/api/obras/:id` | — | Detalle de obra |
| POST | `/api/obras` | — | Crear obra |
| PUT | `/api/obras/:id` | — | Actualizar obra |
| DELETE | `/api/obras/:id` | — | Eliminar obra |
| POST | `/api/usuarios/login` | — | Iniciar sesión (JWT) |
| POST | `/api/usuarios/register` | — | Registrarse |
| GET | `/api/artistas` | — | Listar artistas |
| ... | ... | ... | ... |

> ⚠️ **Seguridad**: Las rutas CRUD actualmente **NO tienen middleware de autenticación** (salvo compras y facturación). Pendiente para próxima iteración.

### Microservicio MongoDB (puerto 3001)

| Método | Ruta | Parámetros | Descripción |
|--------|------|-------------|-------------|
| GET | `/api/catalog/health` | — | Health check del servicio |
| GET | `/api/catalog` | `genero`, `precio_min`, `precio_max`, `estado`, `page`, `limit` | Listado con filtros combinados + paginación (`$facet`) |
| GET | `/api/catalog/:id` | ID (ObjectId o numérico) | Detalle con resolución dual de IDs |
| GET | `/api/catalog/search` | `q` (mín. 2 caracteres) | Búsqueda por texto (`$text` + `textScore`) |

---

## 🔧 Stack Tecnológico

### Backend MySQL

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | 22.x+ | Runtime |
| Express | 5.x | Framework HTTP |
| MySQL2 | 3.x | Driver MySQL con pool de conexiones |
| jsonwebtoken | 9.x | Autenticación JWT |
| bcryptjs | 2.x | Hashing de contraseñas |
| multer | 1.x | Upload de archivos (memoryStorage) |
| cors | 2.x | Cross-Origin Resource Sharing |
| dotenv | 16.x | Variables de entorno |
| axios | 1.x | HTTP client (tests) |

### Microservicio MongoDB (Sprint 1)

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | 22.x+ | Runtime |
| Express | 5.x | Framework HTTP |
| Mongoose | 9.6.1 | ODM con discriminadores polimórficos |
| MongoDB | 8.2.7 | Base de datos documental |
| dotenv | 16.x | Variables de entorno |
| cors | 2.x | Cross-Origin Resource Sharing |

### Frontend

HTML5 + CSS3 + JavaScript vanilla (sin frameworks). Comunicación con ambos backends via `fetch()`.

---

## 🧠 Decisiones de Arquitectura (Sprint 1)

| Decisión | Opción Elegida | Alternativa |
|----------|---------------|-------------|
| **Microservicio vs monolito** | Microservicio independiente (puerto 3001) | Agregar capa MongoDB al backend existente |
| **ODM** | Mongoose 9.6.1 | MongoDB Node.js Driver |
| **Diseño colecciones** | 2 colecciones: `artistas` + `obras` | Colección única embebida |
| **Especialización por género** | Discriminadores polimórficos (5 subtipos) | Schema genérico con campo `tipo` |
| **Búsqueda** | `$text` index con `textScore` | Expresiones regulares |
| **Paginación** | `$facet` (1 consulta) | `$count` + `$skip` + `$limit` (2 consultas) |
| **Embedding vs Referencias** | Híbrido: artista embebido (lectura) + referenciado (escritura) | Solo referencias |
| **IDs** | Resolución dual (ObjectId + numérico) | Solo ObjectId |
| **Fotos** | URLs (strings) | BinData (Buffer) |
| **Feature flag frontend** | Health check con cache 5 min | Config manual |

Ver [docs/decisiones/decisiones-clave-sprint1.md](docs/decisiones/decisiones-clave-sprint1.md) para los ADR completos.

---

## 🧪 Cobertura de Pruebas

| Tipo | Framework | Estado |
|------|-----------|--------|
| Smoke test (API) | Bash + curl | ✅ 21 tests (docs/smoke-test-sprint1.sh) |
| Test unitarios | — | ❌ No implementado |
| Test de integración | — | ❌ No implementado |

Dentro del microservicio MongoDB, los endpoints cubiertos por el smoke test:

- ✅ Health check
- ✅ Listado con paginación
- ✅ Filtro por género
- ✅ Filtro por precio
- ✅ Filtro por disponibilidad
- ✅ Búsqueda `$text`
- ✅ Detalle por ObjectId
- ✅ Detalle por ID numérico
- ✅ Validación de errores (400)
- ✅ Not Found (404)

---

## ⚠️ Problemas Conocidos

1. **🔴 Backend depende del CWD para .env** — Si ejecutás `node app.js` desde cualquier directorio que no sea `Backend/`, `dotenv` no encuentra el `.env` y las queries fallan con "No database selected". Fix pendiente: usar `__dirname` en `app.js`.

2. **🟡 CRUD del monolito sin auth** — Las rutas POST / PUT / DELETE de obras, artistas, etc. no requieren autenticación. Cualquiera puede modificar datos. Solo compras y facturación tienen `verificarToken`.

3. **🟢 Búsqueda `$text` con acentos** — La búsqueda por "Dalí" no encuentra resultados (el text index tokeniza caracteres acentuados de forma distinta). Usar términos sin acentos ("Dali") o el nombre completo.

4. **🟢 Seed de artistas MySQL vacío** — La tabla de artistas en MySQL no tiene datos iniciales. Solo hay géneros y un usuario admin. Ejecutar `seed.sql` o crear artistas via API.

---

## 📜 Licencia

Proyecto académico — Universidad para la BD2 (Bases de Datos II), 2026.
