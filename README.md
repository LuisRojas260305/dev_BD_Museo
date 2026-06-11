# Museo de Arte Contemporáneo

Sistema de gestión museística con arquitectura de microservicios y tres bases de datos, desarrollado para la materia **Bases de Datos II (SBDII)**.

| Base de Datos | Rol | Puerto |
|--------------|-----|--------|
| **MySQL / MariaDB** (via XAMPP) | Usuarios, ventas, facturas, multimedia | 3306 |
| **MongoDB** | Catálogo de obras - 5 géneros polimórficos | 27017 |
| **Apache Cassandra** | Auditoría de eventos y contadores | 9042 |

---

## Inicio Rápido

> El repositorio incluye `iniciar-museo.bat`, pero **es un script personal del autor**: contiene rutas absolutas fijas de su equipo (ubicación del JDK, de Cassandra, del perfil de usuario). No está pensado para ejecutarse tal cual en otra máquina. En un equipo distinto sigue el arranque manual de abajo — es portable y no depende de esas rutas.

Tras instalar los [Prerequisitos](#prerequisitos):

```
git clone <url-del-repo>
cd dev_BD_Museo

REM 1. Dependencias de los tres servicios
cd Backend                && npm install
cd mongodb-service        && npm install
cd ..\cassandra-service   && npm install
cd ..\..

REM 2. Crear los .env a partir de los ejemplos
copy Backend\.env.example Backend\.env
copy Backend\mongodb-service\.env.example Backend\mongodb-service\.env
copy Backend\cassandra-service\.env.example Backend\cassandra-service\.env
```

Luego arranca las bases de datos y los servicios siguiendo [Ejecución manual paso a paso](#ejecución-manual-paso-a-paso).

> El paso que más cuidado requiere es Cassandra: **debe instalarse en `C:\cassandra-install\apache-cassandra-3.11.19\`** con **OpenJDK 11** (no Java 17 ni 21).

**Credenciales por defecto**

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Administrador | `admin@museo.com` | `admin123` |

---

## Prerequisitos

Antes del primer `git clone`, instala el siguiente software. El orden importa para Windows.

### 1. Node.js (runtime para los 3 microservicios)

- Descarga: https://nodejs.org/  
- Versión mínima: **18.x** (recomendado 22.x+)
- Verificar: `node --version`

### 2. XAMPP (Apache + MySQL/MariaDB)

- Descarga: https://www.apachefriends.org/  
- Versión: **8.x** (incluye MariaDB 10.4+)
- Instalar en `C:\xampp` (ruta por defecto)
- Antes de arrancar los servicios, inicia **Apache** y **MySQL** desde el panel de XAMPP
- phpMyAdmin disponible en http://localhost/phpmyadmin

### 3. MongoDB Community Server

- Descarga: https://www.mongodb.com/try/download/community  
- Versión: **7.x o 8.x**
- Durante la instalación: marcar **"Install MongoDB as a Service"** (recomendado)
- Arráncalo con `net start MongoDB` (o desde Servicios de Windows)
- Verificar: `mongod --version`

### 4. Apache Cassandra 3.11.19 + OpenJDK 11

> **Importante:** las rutas de instalacion deben ser exactamente las indicadas para que el script arranque Cassandra sin configuracion adicional.

**a) OpenJDK 11 — instalar PRIMERO**

Cassandra 3.11 solo funciona con Java 8 o Java 11. Java 17, 21 u otras versiones no son compatibles.

- Descarga: https://www.microsoft.com/openjdk
- Seleccionar: **OpenJDK 11** → Windows → .msi
- Instalar con todas las opciones por defecto (agrega `java` al PATH automaticamente)
- Verificar: abrir una terminal nueva y ejecutar `java -version` (debe decir `11.x`)

**b) Apache Cassandra 3.11.19**

- Descarga: https://cassandra.apache.org/download/ → versión **3.11.19** → `apache-cassandra-3.11.19-bin.tar.gz`
- Descomprimir y colocar la carpeta exactamente en:

```
C:\cassandra-install\apache-cassandra-3.11.19\
```

La ruta debe quedar asi (sin variaciones):

```
C:\cassandra-install\
    apache-cassandra-3.11.19\
        bin\
        conf\
        lib\
        ...
```

**c) Crear el directorio de datos**

Crear manualmente la carpeta `C:\cassandra-data\` (Cassandra no la crea sola):

```
C:\cassandra-data\
    data\
    commitlog\
    saved_caches\
    logs\
```

En PowerShell:
```powershell
New-Item -ItemType Directory -Force C:\cassandra-data\data
New-Item -ItemType Directory -Force C:\cassandra-data\commitlog
New-Item -ItemType Directory -Force C:\cassandra-data\saved_caches
New-Item -ItemType Directory -Force C:\cassandra-data\logs
```

**d) Editar `cassandra.yaml`**

Abrir `C:\cassandra-install\apache-cassandra-3.11.19\conf\cassandra.yaml` y cambiar estas 4 lineas:

```yaml
data_file_directories:
    - C:/cassandra-data/data

commitlog_directory: C:/cassandra-data/commitlog

saved_caches_directory: C:/cassandra-data/saved_caches

disk_access_mode: standard
```

> Si instalaste Cassandra en una ruta diferente, ajústala en los comandos de arranque (sección [Ejecución manual](#ejecución-manual-paso-a-paso)) o define la variable de entorno `CASSANDRA_HOME`.

---

## Estructura del Proyecto

```
dev_BD_Museo/
├── iniciar-museo.bat              ← Script personal del autor (rutas fijas; ver nota en Inicio Rápido)
├── requirements.txt               ← Lista de software requerido
│
├── Backend/                       ← Monolito Express (puerto 3000)
│   ├── app.js
│   ├── .env.example               ← Copiar a .env (el .bat lo hace automáticamente)
│   ├── config/database.js
│   ├── controllers/               ← CRUD MySQL por entidad
│   ├── routes/                    ← Rutas: usuarios, ventas, proxy a servicios
│   ├── services/                  ← Proxies y helpers
│   ├── scripts/
│   │   ├── setup-dev.js           ← Crea admin con hash real
│   │   └── sql/
│   │       ├── schema.sql         ← Esquema completo MySQL
│   │       └── seed.sql           ← Datos iniciales
│   │
│   ├── mongodb-service/           ← Microservicio catálogo (puerto 3001)
│   │   ├── server.js
│   │   ├── .env.example
│   │   ├── models/                ← Artista, Obra (5 discriminadores), Genero
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── scripts/
│   │       ├── seed.js            ← Seed automático si MongoDB está vacío
│   │       └── benchmark.js       ← Comparativa de rendimiento entre BDs
│   │
│   └── cassandra-service/         ← Microservicio auditoría (puerto 3002)
│       ├── server.js
│       ├── .env.example
│       ├── init-db.js             ← Crea keyspace + tablas (idempotente)
│       ├── models/
│       └── routes/
│
└── Frontend/                      ← Vanilla HTML/CSS/JS (21 páginas)
    ├── pages/
    │   ├── index.html             ← Catálogo público
    │   ├── Principal/             ← detalle, artista, login, registro
    │   ├── Administrador/         ← dashboard, CRUDs, facturación, consultas
    │   └── Perfiles/              ← perfil, membresía, recuperar password
    ├── css/museo.css              ← Sistema de diseño completo
    └── js/auth.js                 ← Helpers de autenticación
```

---

## Ejecución manual paso a paso

Procedimiento portable (lo que el `.bat` personal hace, pero sin rutas fijas). Asume los [Prerequisitos](#prerequisitos) instalados y las dependencias + `.env` ya preparados según [Inicio Rápido](#inicio-rápido).

### Preparación (una sola vez)

1. **Cargar el esquema MySQL.** Con MySQL iniciado desde XAMPP:
   ```
   C:\xampp\mysql\bin\mysql -u root -e "CREATE DATABASE IF NOT EXISTS Museo"
   C:\xampp\mysql\bin\mysql -u root Museo < Backend\scripts\sql\schema.sql
   C:\xampp\mysql\bin\mysql -u root Museo < Backend\scripts\sql\seed.sql
   ```
2. **Crear el admin con contraseña real** (el `seed.sql` deja un hash placeholder que no sirve para login):
   ```
   cd Backend
   node scripts\setup-dev.js
   ```

### Arranque (cada vez)

1. **Iniciar las bases de datos:**
   - **MySQL + Apache** → desde el panel de XAMPP.
   - **MongoDB** → `net start MongoDB` (si lo instalaste como servicio) o ejecuta `mongod`.
   - **Cassandra** → ejecuta `bin\cassandra.bat` desde `C:\cassandra-install\apache-cassandra-3.11.19\` y espera a que escuche en `:9042`.
     Si crashea con `EXCEPTION_ACCESS_VIOLATION`, renombra en `lib\sigar-bin\` los archivos `sigar-amd64-winnt.dll` y `sigar-x86-winnt.dll` a `.disabled`.
2. **Inicializar Cassandra** (crea keyspace + tablas, idempotente):
   ```
   cd Backend\cassandra-service
   node init-db.js
   ```
3. **Levantar los tres servicios Node** — una terminal por servicio:
   ```
   cd Backend                   && node app.js      REM http://localhost:3000
   cd Backend\mongodb-service   && node server.js   REM :3001 (siembra ~5.000 obras si Mongo está vacío)
   cd Backend\cassandra-service && node server.js   REM :3002
   ```
4. **Abrir el navegador** en http://localhost:3000 . Paneles de cada BD: phpMyAdmin (`http://localhost/phpmyadmin`), Mongo Express (si lo instalaste) y el panel propio de Cassandra en `http://localhost:3002/admin`.

### Benchmark comparativo de las 3 BDs (opcional)

Con las tres bases activas y pobladas:
```
cd Backend\mongodb-service
node scripts\benchmark.js
```
Es una comparación **equitativa**: crea el mismo dataset sintético (clave compuesta `categoria + id`) en las tres BDs y ejecuta las mismas 5 operaciones (escritura, lectura puntual, lectura de partición, rango y conteo por partición), cada una en su forma idiomática y sin anti-patrones. Imprime una tabla por operación (qué BD gana cada una) y un ranking por promedio.

---

## Datos iniciales

| BD | Datos que incluye |
|----|-------------------|
| **MySQL** | 1 admin (`admin@museo.com`), tablas de géneros, preguntas de seguridad |
| **MongoDB** | 5 000 obras distribuidas en 9 géneros, artistas, géneros - seed automático |
| **Cassandra** | Sin datos de auditoría (se generan al usar el sistema) |

---

## Puertos

| Servicio | Puerto |
|---------|--------|
| Backend principal | 3000 |
| mongodb-service | 3001 |
| cassandra-service | 3002 |
| MySQL / MariaDB | 3306 |
| MongoDB | 27017 |
| Cassandra CQL | 9042 |
| Apache HTTP | 80 |
| phpMyAdmin | 80/phpmyadmin |

---

## Arquitectura

```
            ┌─────────────────────────────────┐
            │     Frontend  (Vanilla JS)       │
            │      http://localhost:3000        │
            └──────────────┬──────────────────┘
                           │
            ┌──────────────▼──────────────────┐
            │    Backend MySQL  (Express 5)    │
            │      http://localhost:3000        │
            │                                  │
            │  /api/usuarios   → MySQL directo │
            │  /api/ventas     → MySQL directo │
            │  /api/catalogo/* → proxy :3001   │
            │  /api/eventos/*  → proxy :3002   │
            └──────────┬───────────┬───────────┘
                       │           │
         ┌─────────────▼──┐   ┌───▼──────────────┐
         │ mongodb-service │   │ cassandra-service │
         │    :3001        │   │     :3002         │
         │  Mongoose 9     │   │ cassandra-driver  │
         │  MongoDB 7/8    │   │ Cassandra 3.11    │
         └─────────────────┘   └──────────────────┘
```

---

## Solución de Problemas

**Cassandra no inicia**
- Verifica que Java 11 esté instalado: `java -version` (debe decir `11.x`)
- Si crashea con `EXCEPTION_ACCESS_VIOLATION`, deshabilita las DLLs SIGAR (`lib\sigar-bin\sigar-*-winnt.dll` → renómbralas a `.disabled`)
- En Windows usa `disk_access_mode: standard` en `cassandra.yaml` (evita errores con archivos mapeados en memoria)
- Los datos de Cassandra deben estar en `C:\cassandra-data\` - créalo manualmente si no existe

**MySQL: "acceso denegado"**
- Si tu MySQL tiene contraseña de root, edita `Backend\.env` y añade `DB_PASSWORD=tu_contraseña`
- Al cargar el esquema, añade `-p` al comando `mysql` para que pida la contraseña

**MongoDB no inicia**
- Asegúrate de instalarlo como servicio de Windows durante la instalación
- Para iniciarlo manualmente: `net start MongoDB` (desde una terminal como administrador)

**"admin@museo.com" no funciona para login**
- El `seed.sql` usa un hash placeholder - el `setup-dev.js` lo reemplaza con un hash real
- Si el login falla, ejecuta manualmente: `cd Backend && node scripts\setup-dev.js`

---

## Stack Tecnológico

| Tecnología | Versión | Uso |
|-----------|---------|-----|
| Node.js | 22.x+ | Runtime de los 3 servicios |
| Express | 5.x | Framework HTTP |
| Mongoose | 9.6.x | ODM MongoDB con discriminadores polimórficos |
| cassandra-driver | 4.x | Driver nativo Cassandra |
| MySQL2 | 3.x | Driver MySQL con pool de conexiones |
| jsonwebtoken | 9.x | Autenticación JWT |
| bcrypt | 6.x | Hashing de contraseñas |
| multer | 2.x | Upload de archivos |
| axios | 1.x | Proxies service-to-service |

---

## Decisiones de Arquitectura Clave

| Decisión | Opción Elegida | Justificación |
|----------|---------------|---------------|
| Microservicios por BD | 3 servicios independientes | Aislamiento de fallas, escalado independiente |
| Discriminadores polimórficos | 5 subtipos de Obra en MongoDB | Type-safety, campos específicos por género |
| Paginación MongoDB | `$facet` (1 consulta) | Una sola ida al servidor, atómica |
| Embedding vs Referencias | Híbrido: artista embebido + referenciado | Lecturas O(1) sin populate |
| Particionado Cassandra | Por mes (`mes TEXT`) | Consultas eficientes por rango de tiempo |
| Auth service-to-service | `x-internal-key` en header | Menos latencia que re-validar JWT |

---

## Licencia

Proyecto académico - UNEG, Bases de Datos II (SBDII), 2026.
