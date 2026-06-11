# 🚀 Guía Rápida de Ejecución - dev_BD_Museo

> Proyecto de gestión museística con arquitectura políglota (MySQL + MongoDB)

---

## 📋 Prerequisitos

```bash
node --version   # ≥ 18.x (22.x+ recomendado)
npm --version    # ≥ 9.x
mysql --version  # MariaDB 11.x o MySQL 8.x
mongod --version # ≥ 7.x (8.2.7+ recomendado)
```

---

## 🏁 Paso a paso

### 1. Base de Datos MySQL

```bash
# Crear la base de datos
mysql -u root -e "CREATE DATABASE IF NOT EXISTS test_bodega_museo;"

# Cargar esquema + datos de prueba
mysql -u root test_bodega_museo < Backend/scripts/sql/schema.sql
mysql -u root test_bodega_museo < Backend/scripts/sql/seed.sql
mysql -u root test_bodega_museo < Backend/scripts/sql/genero.sql
```

> ⚠️ Si usás MariaDB con `unix_socket`, conectate sin contraseña.

---

### 2. Backend MySQL → puerto `3000`

```bash
cd Backend
node app.js
# → "Servidor en http://localhost:3000"
```

> ⚠️ **IMPORTANTE**: ejecutá `node app.js` SIEMPRE desde `Backend/`. Si lo corrés desde otro lado, no encuentra el `.env` y falla con "No database selected".

---

### 3. MongoDB → puerto `27017`

```bash
# Arranque manual (NO con systemd - crashea con SEGV)
mongod --dbpath Backend/mongodb-service/data \
       --logpath Backend/mongodb-service/data/mongod.log \
       --fork --port 27017 --nounixsocket

# Verificar que está vivo
mongosh --port 27017 --eval "db.runCommand({ping:1})"
# → { "ok": 1 }
```

---

### 4. Microservicio MongoDB → puerto `3001`

```bash
cd Backend/mongodb-service

# Poblar datos de ejemplo (solo la primera vez)
node scripts/seed.js
# → 3 artistas + 5 obras (1 por género artístico)

# Arrancar
node server.js
# → "Servicio MongoDB corriendo en puerto 3001"
```

---

### 5. Frontend → puerto `8080`

```bash
# El frontend es HTML estático. Servilo con cualquier HTTP server:
python3 -m http.server 8080 -d Frontend/
# → http://localhost:8080
```

---

## ✅ Verificación

```bash
# Smoke test completo (requiere MongoDB + microservicio)
bash docs/smoke-test-sprint1.sh
# → 21/21 PASS
```

---

## 🗺️ Orden de arranque

```
MariaDB/MySQL (3306)  →  Backend MySQL (3000)
                                     ↓
MongoDB (27017)       →  Microservicio (3001)
                                     ↓
                           Frontend (8080)
```

El frontend detecta automáticamente si el microservicio MongoDB está disponible via health check. Si no responde, usa MySQL como fallback.

---

## 🐛 Bugs conocidos

| # | Problema | Workaround |
|---|----------|-----------|
| 1 | Backend MySQL depende del CWD para `.env` | Ejecutar `node app.js` desde `Backend/` |
| 2 | `.env.example` de Backend/ incompleto (falta `JWT_SECRET`) | Usar el `.env` real como referencia |
| 3 | Búsqueda `$text` con acentos - "Dalí" no funciona | Buscar sin acentos: "Dali" |
| 4 | `detalle.html` no chequea MongoDB si llegás directo a la URL | Navegar desde `index.html` |
| 5 | CRUD del monolito sin auth - rutas POST/PUT/DELETE son públicas | Solo compras y facturación tienen JWT |

---

## 📌 Comandos rápidos (copia y pega)

```bash
# 1. MySQL
mysql -u root -e "CREATE DATABASE IF NOT EXISTS test_bodega_museo;"
mysql -u root test_bodega_museo < Backend/scripts/sql/schema.sql
mysql -u root test_bodega_museo < Backend/scripts/sql/seed.sql
mysql -u root test_bodega_museo < Backend/scripts/sql/genero.sql

# 2. Backend MySQL
cd Backend && node app.js &

# 3. MongoDB
mongod --dbpath Backend/mongodb-service/data --logpath Backend/mongodb-service/data/mongod.log --fork --port 27017 --nounixsocket

# 4. Microservicio MongoDB
cd Backend/mongodb-service && node scripts/seed.js && node server.js &

# 5. Frontend
python3 -m http.server 8080 -d Frontend/ &

# 6. Verificar
bash docs/smoke-test-sprint1.sh
```
