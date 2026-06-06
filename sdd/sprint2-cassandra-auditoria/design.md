# Diseño Técnico: Sprint 2 — Cassandra Auditoría

## 1. Instalación de Cassandra (PC local)

**Requisito**: Cassandra 5.0 necesita JDK 17 (el sistema tiene JDK 25).

```bash
# 1. Instalar JDK 17 si no está
yay -S jdk17-openjdk

# 2. Verificar versiones
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
$JAVA_HOME/bin/java -version  # debe mostrar 17.x

# 3. Instalar Cassandra desde AUR
yay -S cassandra

# 4. Iniciar servicio
sudo systemctl start cassandra
sudo systemctl enable cassandra   # opcional, para inicio automático

# 5. Verificar
nodetool status  # debe mostrar UN en el cluster

# 6. Probar acceso CQL
cqlsh localhost 9042
CREATE KEYSPACE test WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};
DROP KEYSPACE test;
```

> Si AUR falla, usar tarball: descargar `apache-cassandra-5.0.8-bin.tar.gz`, extraer a `/opt/cassandra`, ejecutar `$JAVA_HOME=/usr/lib/jvm/java-17-openjdk /opt/cassandra/bin/cassandra -R`.

---

## 2. Estructura del Microservicio

```
Backend/cassandra-service/
├── package.json
├── .env
├── server.js                # Entry point (Express 5, puerto 3002)
├── config/
│   └── cassandra.js         # Client de conexión (cassandra-driver)
├── models/
│   ├── eventos.js           # Queries prepared para eventos_auditoria
│   └── resumenes.js         # Queries prepared para resumen_eventos
├── routes/
│   └── auditoria.routes.js  # POST/GET eventos, GET reportes
├── controllers/
│   └── auditoria.controller.js
├── middleware/
│   ├── authMiddleware.js    # Copia exacta de shared/authMiddleware.js
│   └── errorHandler.js      # Mismo patrón que mongodb-service
├── scripts/
│   └── schema.cql           # DDL completo del keyspace y tablas
├── init-db.js               # Script para bootstrap del schema desde Node
└── test-smoke.sh            # Smoke test con curl
```

**Patrón**: Sigue exactamente la misma estructura que `mongodb-service/`. El `authMiddleware.js` se copia literal de `shared/authMiddleware.js` (está diseñado para ser copiado sin cambios).

---

## 3. Esquema CQL

```sql
-- scripts/schema.cql

CREATE KEYSPACE IF NOT EXISTS museo_auditoria
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

USE museo_auditoria;

-- Tabla principal: eventos inmutables, append-only
-- Partition: mes (YYYY-MM) para queries sin ALLOW FILTERING
-- Clustering: timestamp DESC + id TIMEUUID para orden + unicidad
CREATE TABLE IF NOT EXISTS eventos_auditoria (
    mes         TEXT,         -- partition key, formato '2026-06'
    timestamp   TIMESTAMP,    -- clustering key DESC
    id          TIMEUUID,     -- clustering key, orden temporal único
    tipo_evento TEXT,         -- login_exitoso, login_fallido, etc.
    usuario     TEXT,         -- email o 'sistema'
    severidad   TEXT,         -- info | warning | critical
    metadata    TEXT,         -- JSON string: {obra_id: 5, precio: 1500}
    ip          TEXT,         -- dirección IP del solicitante
    PRIMARY KEY ((mes), timestamp, id)
) WITH CLUSTERING ORDER BY (timestamp DESC, id DESC);

-- Tabla de resúmenes agregados (contadores)
-- Partition: tipo_evento — permite query por tipo
CREATE TABLE IF NOT EXISTS resumen_eventos (
    tipo_evento TEXT,    -- partition key
    fecha       DATE,    -- clustering key
    total       COUNTER, -- contador atómico
    detalle     TEXT,    -- JSON: {"por_usuario": {...}, "por_severidad": {...}}
    PRIMARY KEY ((tipo_evento), fecha)
) WITH CLUSTERING ORDER BY (fecha DESC);
```

**Decisión**: `resumen_eventos` se actualiza mediante un UPDATE con incremento de COUNTER desde el modelo, no con triggers ni jobs externos. El `detalle` se actualiza con un UPDATE que concatena el JSON (se reemplaza completamente en cada actualización diaria).

---

## 4. Conexión (cassandra.js)

```javascript
// config/cassandra.js
const cassandra = require('cassandra-driver');

const client = new cassandra.Client({
    contactPoints: [process.env.CASSANDRA_HOST || '127.0.0.1'],
    localDataCenter: process.env.CASSANDRA_DC || 'datacenter1',
    keyspace: process.env.CASSANDRA_KEYSPACE || 'museo_auditoria',
    pooling: {
        coreConnectionsPerHost: {
            [cassandra.types.distanceLocal]: 2,
            [cassandra.types.distanceRemote]: 1,
        },
    },
    queryOptions: {
        consistency: cassandra.types.consistencies.localOne,
        prepare: true,
    },
});

async function connect() {
    try {
        await client.connect();
        console.log('Conectado a Cassandra');
    } catch (err) {
        console.error('Error conectando a Cassandra:', err.message);
        // No salir — el servicio puede operar sin Cassandra
    }
}

function getClient() { return client; }

module.exports = { client, connect, getClient };
```

**Detalles clave**:
- `prepare: true` por defecto en `queryOptions` para que todos los statements sean **prepared** automáticamente.
- `consistency: LOCAL_ONE` para máxima velocidad en escrituras (single node dev).
- `connect()` NO hace `process.exit(1)` si falla — el microservicio arranca igual y devuelve 503 cuando Cassandra está caído.

---

## 5. Modelos

### modelos/eventos.js

```javascript
const { client } = require('../config/cassandra');
const { v4: uuidv4 } = require('uuid'); // para solicitud_id
const cassandra = require('cassandra-driver');

const INSERT_EVENTO = `
    INSERT INTO eventos_auditoria (mes, timestamp, id, tipo_evento, usuario, severidad, metadata, ip)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`;

const QUERY_EVENTOS = `
    SELECT * FROM eventos_auditoria
    WHERE mes = ? AND timestamp >= ? AND timestamp <= ?
    ORDER BY timestamp DESC LIMIT ?
`;

const QUERY_EVENTOS_SIN_DESDE = `
    SELECT * FROM eventos_auditoria
    WHERE mes = ? AND timestamp <= ?
    ORDER BY timestamp DESC LIMIT ?
`;

// Helper: genera meses entre dos fechas
function* mesesEntre(desde, hasta) {
    let d = new Date(desde);
    const h = new Date(hasta);
    while (d <= h) {
        const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        yield mes;
        d.setMonth(d.getMonth() + 1);
    }
}

async function registrarEvento({ tipo_evento, usuario, severidad, metadata, ip }) {
    const ahora = new Date();
    const mes = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
    const id = cassandra.types.TimeUuid.now();
    const metaStr = metadata ? JSON.stringify(metadata) : '{}';

    await client.execute(INSERT_EVENTO, [
        mes, ahora, id, tipo_evento, usuario, severidad, metaStr, ip || null
    ], { prepare: true });

    return { id: id.toString(), timestamp: ahora };
}

async function consultarEventos({ tipo_evento, desde, hasta, limite = 100 }) {
    const inicio = desde ? new Date(desde) : new Date('2000-01-01');
    const fin = hasta ? new Date(hasta) : new Date();
    const max = Math.min(limite, 1000);

    const resultados = [];
    for (const mes of mesesEntre(inicio, fin)) {
        const params = desde
            ? [mes, inicio, fin, max - resultados.length]
            : [mes, fin, max - resultados.length];
        const query = desde ? QUERY_EVENTOS : QUERY_EVENTOS_SIN_DESDE;

        const rs = await client.execute(query, params, { prepare: true });
        resultados.push(...rs.rows);
        if (resultados.length >= max) break;
    }

    return resultados.slice(0, max).map(row => ({
        id: row.id.toString(),
        timestamp: row.timestamp,
        mes: row.mes,
        tipo_evento: row.tipo_evento,
        usuario: row.usuario,
        severidad: row.severidad,
        metadata: row.metadata ? JSON.parse(row.metadata) : {},
        ip: row.ip,
    }));
}

async function obtenerEventoPorSolicitud(solicitudId) {
    // Búsqueda por metadata requiere escanear (no hay índice en metadata)
    // Se busca en los últimos 3 meses como optimización
    const meses = [];
    for (let i = 0; i < 3; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const resultados = [];
    for (const mes of meses) {
        const rs = await client.execute(
            'SELECT * FROM eventos_auditoria WHERE mes = ?',
            [mes],
            { prepare: true }
        );
        for (const row of rs.rows) {
            if (row.metadata && row.metadata.includes(solicitudId)) {
                resultados.push(row);
            }
        }
    }
    return resultados;
}

module.exports = { registrarEvento, consultarEventos, obtenerEventoPorSolicitud };
```

### modelos/resumenes.js

```javascript
const { client } = require('../config/cassandra');

const UPSERT_RESUMEN = `
    UPDATE resumen_eventos SET total = total + 1, detalle = ?
    WHERE tipo_evento = ? AND fecha = ?
`;

const QUERY_RESUMEN = `
    SELECT * FROM resumen_eventos
    WHERE tipo_evento = ? AND fecha = ?
`;

const QUERY_RESUMEN_GLOBAL = `
    SELECT * FROM resumen_eventos
    WHERE tipo_evento = ?
    ORDER BY fecha DESC
`;

async function actualizarResumen(tipo_evento, fecha, detalleActualizado) {
    await client.execute(UPSERT_RESUMEN, [
        JSON.stringify(detalleActualizado), tipo_evento, fecha
    ], { prepare: true });
}

async function consultarResumenes({ tipo_evento, fecha }) {
    if (tipo_evento && fecha) {
        const rs = await client.execute(QUERY_RESUMEN, [tipo_evento, fecha], { prepare: true });
        return rs.rows.map(formatResumen);
    }
    if (tipo_evento) {
        const rs = await client.execute(QUERY_RESUMEN_GLOBAL, [tipo_evento], { prepare: true });
        return rs.rows.map(formatResumen);
    }
    // Si no hay tipo, escanear todos los tipos conocidos
    const tipos = ['login_exitoso','login_fallido','solicitud_compra','compra_aceptada',
                   'compra_rechazada','compra_cancelada','modificacion_obra',
                   'modificacion_artista','cambio_rol','error_sistema'];
    const resultados = [];
    for (const tipo of tipos) {
        const rs = await client.execute(QUERY_RESUMEN, [tipo, fecha], { prepare: true });
        resultados.push(...rs.rows.map(formatResumen));
    }
    return resultados;
}

function formatResumen(row) {
    return {
        tipo_evento: row.tipo_evento,
        fecha: row.fecha,
        total: row.total.toString(), // COUNTER returns Long
        detalle: row.detalle ? JSON.parse(row.detalle) : {},
    };
}

module.exports = { actualizarResumen, consultarResumenes };
```

---

## 6. Controlador

```javascript
// controllers/auditoria.controller.js
const eventosModel = require('../models/eventos');
const resumenesModel = require('../models/resumenes');

async function createEvent(req, res, next) {
    try {
        const { tipo_evento, severidad, metadata } = req.body;
        if (!tipo_evento || !req.body.usuario) {
            return res.status(400).json({ error: 'tipo_evento y usuario son obligatorios' });
        }
        if (!['info', 'warning', 'critical'].includes(severidad)) {
            return res.status(400).json({ error: 'Severidad debe ser info, warning o critical' });
        }

        const ip = req.ip || req.connection?.remoteAddress;
        const usuario = req.body.usuario;

        const result = await eventosModel.registrarEvento({
            tipo_evento, usuario, severidad, metadata, ip
        });

        // Actualizar resumen (fuego-olvido dentro del mismo servicio)
        try {
            const hoy = new Date().toISOString().split('T')[0];
            await resumenesModel.actualizarResumen(tipo_evento, hoy, {
                ultimo_evento: result.timestamp,
                usuario_actual: usuario,
            });
        } catch { /* resumen no crítico */ }

        res.status(201).json({ mensaje: 'Evento registrado', id: result.id });
    } catch (err) {
        if (err.code === 'CassandraError' || err.message?.includes('All host(s)')) {
            return res.status(503).json({ error: 'Servicio de auditoría no disponible' });
        }
        next(err);
    }
}

async function getEvents(req, res, next) {
    try {
        const { tipo, desde, hasta, limite } = req.query;
        if (!tipo) return res.status(400).json({ error: "El parámetro 'tipo' es obligatorio" });

        const eventos = await eventosModel.consultarEventos({
            tipo_evento: tipo, desde, hasta, limite: parseInt(limite) || 100
        });
        res.json(eventos);
    } catch (err) {
        next(err);
    }
}

async function getReports(req, res, next) {
    try {
        const { tipo, fecha } = req.query;
        if (!fecha) return res.status(400).json({ error: "El parámetro 'fecha' es obligatorio" });

        const reportes = await resumenesModel.consultarResumenes({ tipo_evento: tipo, fecha });
        res.json(reportes);
    } catch (err) {
        next(err);
    }
}

function healthCheck(req, res) {
    const { client } = require('../config/cassandra');
    if (client && !client.isDisposed()) {
        res.json({ status: 'ok', cassandra: 'connected' });
    } else {
        res.status(503).json({ status: 'error', cassandra: 'disconnected' });
    }
}

module.exports = { createEvent, getEvents, getReports, healthCheck };
```

**Rutas** (`routes/auditoria.routes.js`):
```javascript
const router = require('express').Router();
const ctrl = require('../controllers/auditoria.controller');
const { verificarToken, verificarAdmin } = require('../middleware/authMiddleware');

router.post('/eventos',    verificarToken,  ctrl.createEvent);
router.get('/eventos',     verificarToken, verificarAdmin, ctrl.getEvents);
router.get('/reportes',    verificarToken, verificarAdmin, ctrl.getReports);
router.get('/health',      ctrl.healthCheck);

module.exports = router;
```

---

## 7. Disparo de Eventos desde el Monolito (Backend/)

### Helper centralizado: `Backend/services/auditoriaHelper.js`

```javascript
const axios = require('axios');

const CASSANDRA_URL = process.env.CASSANDRA_URL || 'http://localhost:3002/api/auditoria';

async function auditar(tipo_evento, usuario, severidad, metadata = {}) {
    try {
        await axios.post(`${CASSANDRA_URL}/eventos`, {
            tipo_evento, usuario, severidad, metadata
        }, { timeout: 2000 });
    } catch (err) {
        console.error(`Auditoría no disponible (${tipo_evento}):`, err.message);
        // Fire-and-forget: el monolito nunca falla por auditoría
    }
}

module.exports = { auditar };
```

> **Fire-and-forget**: `timeout: 2000ms`. Si Cassandra está caído, el `catch` captura el error y el monolito continúa. El cliente nunca recibe un error 500 por auditoría.

### Puntos de integración

| Archivo | Función | Evento | Metadata |
|---------|---------|--------|----------|
| `controllers/Usuario/usuarioController.js:login` | login exitoso (L93) | `login_exitoso` | — |
| `controllers/Usuario/usuarioController.js:login` | login fallido (L83, L89) | `login_fallido` | `{intentos_seguidos}` |
| `controllers/Compra/ventaController.js:reservarObra` | obra reservada (L43) | `solicitud_compra` | `{obra_id, precio, solicitud_id}` |
| `controllers/Compra/ventaController.js:concretarVenta` | venta concretada (L107) | `compra_aceptada` | `{admin_id, solicitud_id}` |
| `controllers/Compra/ventaController.js:cancelarVenta` | reserva cancelada (L142) | `compra_rechazada` | `{motivo}` |
| `controllers/Obra/obraController.js:createObra` | obra creada (L230) | `modificacion_obra` | `{accion:'crear'}` |
| `controllers/Obra/obraController.js:updateObra` | obra actualizada (L300) | `modificacion_obra` | `{accion:'editar'}` |
| `controllers/Obra/obraController.js:deleteObra` | obra eliminada (L248) | `modificacion_obra` | `{accion:'eliminar'}` |
| `controllers/Artista/artistasController.js:createArtista` | artista creado (L120) | `modificacion_artista` | `{accion:'crear'}` |
| `controllers/Artista/artistasController.js:updateArtista` | artista actualizado (L187) | `modificacion_artista` | `{accion:'editar'}` |
| `controllers/Artista/artistasController.js:deleteArtista` | artista eliminado (L204) | `modificacion_artista` | `{accion:'eliminar'}` |
| `controllers/Usuario/usuarioController.js:updateUsuario` | cambio de rol (L425-440) | `cambio_rol` | `{rol_anterior, rol_nuevo}` |
| `app.js:errorHandler` | error 500 (L92) | `error_sistema` | `{endpoint, codigo_error}` |

---

## 8. Decisiones de Diseño

| ID | Decisión | Opciones | Elección | Rationale |
|----|----------|----------|----------|-----------|
| D1 | Cassandra version | 4.x vs 5.0 | **5.0** (última stable) | Mayor performance, mejor manejo de contadores, compatibilidad con drivers modernos |
| D2 | CQL partition key | UUID vs TIMEUUID vs mes | **mes (TEXT)** + `timestamp DESC` | Permite queries por rango sin ALLOW FILTERING. TIMEUUID como clustering para orden + unicidad |
| D3 | Statements | Literales vs Prepared | **Prepared** via `queryOptions.prepare: true` | Previene CQL injection, caching de plan de ejecución en Cassandra. Config global en Client |
| D4 | Fire-and-forget | axios vs HTTP nativo vs cola | **axios** con timeout 2s | Ya es dependencia del monolito. Cola en memoria sería overkill para un solo nodo |
| D5 | Metadata formato | MAP<TEXT,TEXT> vs TEXT | **TEXT** (JSON string) | Cassandra no tiene índices en MAP para queries arbitrarias. TEXT serializado es más flexible y portable |
| D6 | solicitud_id | UUID v4 vs Ulid | **UUID v4** (crypto.randomUUID) | Suficiente para correlación. No necesitamos ordenamiento de IDs |
| D7 | Query por metadata | Índice secundario vs scan | **Scan por rango de meses** (últimos 3) | `obtenerEventoPorSolicitud` se usa solo para correlacionar compras. Índice en metadata no vale la pena para este volumen |
| D8 | Resumen actualización | Batch post-insert vs UPDATE | **UPDATE COUNTER** en cada INSERT | Simplicidad. El costo de un UPDATE por evento es mínimo comparado con mantener un job externo |

---

## 9. Orden de Implementación

| Paso | Tarea | Depende de |
|------|-------|-----------|
| 1 | Instalar Cassandra 5.0 + JDK 17 + verificar nodetool | — |
| 2 | Crear estructura `Backend/cassandra-service/` (package.json, .env, server.js) | — |
| 3 | Ejecutar `schema.cql` contra Cassandra | Paso 1 |
| 4 | Implementar `config/cassandra.js` + `init-db.js` | Paso 2 |
| 5 | Implementar modelos: `eventos.js`, `resumenes.js` | Paso 4 |
| 6 | Implementar `routes/auditoria.routes.js` + `controllers/auditoria.controller.js` | Paso 5 |
| 7 | Agregar `middleware/authMiddleware.js` + `errorHandler.js` | Paso 2 |
| 8 | Crear `test-smoke.sh` y probar endpoints | Paso 6 |
| 9 | Agregar `services/auditoriaHelper.js` en el monolito | — |
| 10 | Integrar llamadas en `usuarioController.js` (login) | Paso 9 |
| 11 | Integrar llamadas en `ventaController.js` | Paso 9 |
| 12 | Integrar llamadas en `obraController.js` | Paso 9 |
| 13 | Integrar llamadas en `artistasController.js` | Paso 9 |
| 14 | Integrar llamadas en `usuarioController.js` (cambio_rol) | Paso 9 |
| 15 | Agregar error handler global en `app.js` (`error_sistema`) | Paso 9 |

---

## 10. Riesgos y Mitigaciones

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|-------------|------------|
| Cassandra caído | Eventos no registrados | Baja (dev) | Fire-and-forget con try/catch. El monolito nunca falla |
| JDK 17 no encontrado | Cassandra no arranca | Media | Verificar `JAVA_HOME` apunta a JDK 17 explícito |
| Queries sin partition key | ALLOW FILTERING | Baja | Solo se permite en `obtenerEventoPorSolicitud` (scan acotado a 3 meses) |
| COUNTER overflow | resumen_eventos corrupto | Muy baja | `total` es `bigint` (~9 quintillones). No relevante para este volumen |
| TIMEUUID duplicado | Colisión de clustering key | Extremadamente baja | `TimeUuid.now()` garantiza unicidad temporal en el mismo nodo |
