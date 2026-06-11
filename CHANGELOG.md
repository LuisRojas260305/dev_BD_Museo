# Historial de cambios

Registro de los cambios más importantes del proyecto "Museo de arte contemporáneo" a lo largo de sus sprints de desarrollo.

---

## Sprint 3 - Diseño e interfaz (10 jun 2026)

### Población masiva de datos (`bulk-seed.js`)

El hecho más significativo de este sprint: se creó y ejecutó un script de seed masivo que pobló las tres bases de datos simultáneamente, llevando el sistema de datos de prueba mínimos a un volumen realista de producción. Dataset inspirado en el Metropolitan Museum of Art (Kaggle, open access).

**MongoDB** — catálogo
- 60 artistas de reconocimiento internacional: Monet, Van Gogh, Klimt, Pollock, Frida Kahlo, Picasso, Botero, Kusama, Hokusai, Fabergé y 50 más, cubriendo Impresionismo, Abstraccionismo, Fotografía, Orfebrería, Textil, Grabado y más.
- 500 obras con detalles polimórficos completos por género:

| Género | Cantidad |
|--------|----------|
| Pintura | 150 |
| Escultura | 70 |
| Fotografía | 60 |
| Cerámica | 55 |
| Orfebrería | 45 |
| Cristalería | 40 |
| Textil | 35 |
| Grabado | 35 |
| Acuarela | 10 |
| **Total** | **500** |

- 4 nuevos géneros artísticos incorporados al schema y al sistema: Cristalería, Textil, Grabado, Acuarela (sumados a los 5 originales).
- Estados distribuidos de forma realista: ~60 % Disponible, ~20 % Vendida, ~20 % Reservada.

**MySQL** — transaccional
- 200 usuarios miembros con nombres, apellidos y emails realistas.
- Tarjetas de crédito Visa y Mastercard generadas (datos de prueba).
- Hasta 300 ventas distribuidas en los últimos 24 meses.

**Cassandra** — auditoría
- 2 000 eventos de auditoría repartidos en los últimos 90 días, en cuatro categorías: `login` (INFO), `compra` (INFO), `admin` (WARN), `sistema` (ERROR).
- 1 000 registros de visitas distribuidos en 100 obras distintas, últimos 30 días.

**Scripts creados**
- `bulk-seed.js` — seed masivo coordinado de las tres BDs en una sola ejecución.
- `benchmark.js` — mide y compara tiempos de respuesta de consultas reales en MongoDB, MySQL y Cassandra con el volumen de producción.
- `fix-users.js` — utilidad para corregir emails y datos de tarjeta de los usuarios bulk.

---

### Sistema de diseño (`museo.css`)

- **Fuente global cambiada a Cormorant Garamond** (serif). Reemplaza Playfair Display en titulares, logo y encabezados. DM Sans permanece para el cuerpo.
- **Pesos tipográficos ajustados**: logo `font-weight: 600`, `contemporáneo` en itálica `300`, "Colección permanente" `600`, títulos de obra en cards y ficha `600`.
- **Logo rediseñado**: barra vertical con gradiente vino-rosa, `contemporáneo` en itálica ligera, tamaño 1.65rem.
- **Paleta extendida**: variable `--logo-accent` (#c45578) para el acento rosa del logo, footer y detalles decorativos.
- **Chips de estado rediseñados**: punto de color antes del texto (verde / ámbar / gris), padding más generoso, `border-radius: 100px`.

### Identidad y contenido

- **Capitalización corregida** en los 19 archivos HTML: "Museo de arte contemporáneo" con mayúscula inicial correcta en español (en logo y pie de página).
- **Footer actualizado** en todos los archivos: botón circular GitHub en morado, posicionado bajo el copyright.

### Catálogo principal (`index.html`)

- **Barra de filtros**: fondo cambiado de blanco (`--surface`) a crema (`--cream`), eliminando la franja blanca visible. Centrada con `max-width: 1100px`.
- **Cards de obras**: imagen 240px, gradiente en borde inferior, hover con elevación 7px y sombra vino.
- **Chips de estado**: posicionados sobre la imagen de cada card con el nuevo estilo de punto indicador.

### Panel del administrador (`admin-dashboard.html`)

- **Rediseño completo**: banner con gradiente oscuro, saludo personalizado con nombre del admin, badge de rol.
- **Tarjetas de módulos**: ícono SVG + título + subtítulo, bullet animado al hover.
- **Eliminado el círculo verde** del banner de auditoría Cassandra (elemento HTML y su CSS).

### Perfil de artista (`artista.html`)

- **Bandera de nacionalidad**: círculo 52px con la bandera del país (flagcdn.com), nombre del país debajo.
- **Mapa de países**: normalización de texto libre en español → código ISO 2 letras (40+ entradas).
- **Géneros artísticos**: mostrados como badges `badge-wine`.

### Otras páginas

- **Detalle de obra**: barra decorativa bajo el título, animación `fadeUp` en reseñas.
- **Registro**: mensaje de cuenta creada centrado.
- **Animaciones suavizadas** en cards, fichas y reseñas con `fadeUp`.
- **README actualizado**: sección de stack de frontend con fuentes y sistema de diseño.

### Correcciones de bugs

| # | Bug | Archivos | Fix |
|---|-----|----------|-----|
| 1 | `concretarVenta` no actualizaba MongoDB al confirmar una venta; la obra quedaba como `'Reservada'` indefinidamente | `ventaController.js` | Agregado `axios.put` que marca la obra como `'Vendida'` en MongoDB después del commit de MySQL |
| 2 | Los chips de estado en el catálogo y la ficha de artista comparaban contra `'Reservado'` y `'Vendido'` (masculino), pero MongoDB guarda `'Reservada'` y `'Vendida'`; toda obra aparecía como "Disponible" | `index.html`, `artista.html`, `detalle.html` | Comparación directa contra los strings del enum del schema de MongoDB |
| 3 | `detalle.html` usaba un mapa numérico `{1: 'Disponible', 2: 'Reservado', 3: 'Vendido'}` incompatible con el schema de strings de MongoDB | `detalle.html` | Eliminado el mapa; `estadoTexto = obra.estado` directamente. Claves del mapa de clases CSS actualizadas a `'Reservada'` y `'Vendida'` |

---

## Sprint 2 - Cassandra y refactor de autenticación (2025-2026)

### Microservicio Cassandra (puerto 3002)

- Nuevo microservicio `cassandra-service` con Express 5 + `cassandra-driver`.
- Tabla `eventos_auditoria`: particionada por mes (`PRIMARY KEY ((mes), timestamp, id)`), orden descendente. Registra tipo de evento, usuario, severidad, IP, metadata.
- Tabla `resumen_eventos`: tabla de contadores (`COUNTER`), agrupada por tipo de evento y fecha. Permite reportes rápidos sin escaneo completo.
- Endpoints: `POST /api/auditoria/eventos`, `GET /api/auditoria/eventos` con filtros, `GET /api/auditoria/reportes`, `GET /api/auditoria/health`.
- Proxy en el monolito: `eventosProxy.js` con wrapper `{ success, data }` consistente.

### Refactor de autenticación

- `authMiddleware.js` consolidado en `Backend/shared/auth.js`. Los tres microservicios usan el mismo módulo canónico.
- Rutas POST/PUT/DELETE del catálogo protegidas con `verificarAdmin` (antes estaban abiertas).
- Comunicación service-to-service via `x-internal-key` para evitar re-validación JWT entre microservicios.

### Correcciones de bugs

| # | Bug | Fix |
|---|-----|-----|
| 1 | CRUD de obras/artistas sin autenticación | `verificarAdmin` en las 17 rutas afectadas |
| 2 | `dotenv` no resolvía `.env` fuera del CWD | `path.resolve(__dirname, '.env')` |
| 3 | Respuestas de Cassandra sin wrapper `{success, data}` | Wrapper en `eventosProxy.js` y `eventos.routes.js` |
| 4 | `artista_id` llegaba como objeto `{$oid: ...}` al frontend | Simplificado a string directo en `fieldMapper.js` |
| 5 | Link a artista mostraba `id=undefined` sin artista | Link condicional si `artista_id` existe |
| 6 | `porcentaje_ganancia` visible en perfil público de artista | Línea eliminada de `artista.html` |
| 7 | Fotos de obras apuntaban a ruta MySQL antigua | Cambiado a `obra.fotos[0]` con fallback |

---

## Sprint 1 - Microservicio MongoDB (2025)

### Microservicio MongoDB (puerto 3001)

- Nuevo microservicio `mongodb-service` con Express 5 + Mongoose 9.6.1.
- **2 colecciones** reemplazan ~20 tablas MySQL: `artistas` y `obras`.
- **5 discriminadores polimórficos** en `obras`: Pintura, Escultura, Fotografía, Cerámica, Orfebrería. Cada subtipo tiene sus campos específicos en el subdocumento `detalles`.
- **Índice `$text`** sobre título, descripción, técnica y nombre de artista embebido.
- **Paginación con `$facet`**: una sola consulta retorna los datos y el total simultaneamente.
- **Resolución dual de IDs**: acepta ObjectId de MongoDB y IDs numéricos heredados de MySQL.
- **Artista embebido + referenciado**: escrituras atómicas con `artista_id`, lecturas O(1) sin populate.

### Scripts de migración y seed

- `scripts/seed.js`: pobla MongoDB con artistas y obras de ejemplo sin depender de MySQL.
- `scripts/migrate.js`: ETL de MySQL → MongoDB en batches de 100.
- `scripts/setup-dev.js`: genera datos de desarrollo en MySQL (admin, artistas, obras).

### Correcciones de bugs

| # | Bug | Fix |
|---|-----|-----|
| 1 | MongoDB SEGV (Signal 11) por corrupción WiredTiger | Data dir aislado + `--nounixsocket` |
| 2 | `dotenv` no cargado en `server.js` del microservicio | `require('dotenv').config()` al inicio |
| 3 | Duplicate key en índices `unique` | `sparse: true` en índices opcionales |
| 4 | Discriminadores no compilaban en `seed.js` | `mongoose.model(obra.genero)` en vez de constructor directo |
| 5 | Artista no importado en `seed.js` | `require('../models/Artista')` |

---

## Base - Monolito MySQL (inicial)

- Backend Express 5 con pool MySQL2 (10 conexiones).
- CRUD de usuarios, ventas, facturas, multimedia (MEDIUMBLOB en MySQL).
- Autenticación JWT con roles: `usuario`, `miembro`, `administrador`.
- Recuperación de contraseña con preguntas de seguridad.
- Membresías: activación con código de seguridad.
- Upload de imágenes via Multer (memoryStorage, 10 MB).
- Frontend vanilla: 21 páginas HTML + CSS + JavaScript sin frameworks.
- SSL Context Layer: seguimiento de sesiones anónimas en memoria.
