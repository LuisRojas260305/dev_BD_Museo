# Full Spec: Cassandra Audit Service

> Sprint 2 — Microservicio de auditoría con Apache Cassandra
> Persistencia: Engram (topic_key: `sdd/sprint2-cassandra-auditoria/spec`)

---

## Purpose

Microservicio de auditoría con Cassandra para registro inmutable de eventos del sistema museístico. Soporta escrituras append-only y consultas por rango temporal sin ALLOW FILTERING.

---

## Installation Requirements

### Cassandra 5.0 (PC Local — NO Docker)

**Requisitos previos**:
- OpenJDK 17+ (JDK 25 instalado → compatible con `JAVA_HOME` apuntando a JDK 17)
- Verificar con: `java -version`
- Si hay múltiples JDK: `export JAVA_HOME=/usr/lib/jvm/java-17-openjdk`
- Si no está JDK 17: `yay -S jdk17-openjdk`

**Opción A — AUR**:
```bash
yay -S cassandra
sudo systemctl start cassandra
nodetool status  # debe mostrar UN
```

**Opción B — Tarball**:
```bash
curl -OL https://downloads.apache.org/cassandra/5.0.8/apache-cassandra-5.0.8-bin.tar.gz
tar -xzf apache-cassandra-5.0.8-bin.tar.gz
sudo mv apache-cassandra-5.0.8 /opt/cassandra
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
/opt/cassandra/bin/cassandra -R
/opt/cassandra/bin/nodetool status
```

**Verificación**:
```bash
/opt/cassandra/bin/cqlsh localhost 9042
CREATE KEYSPACE test WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};
DROP KEYSPACE test;
```

### Driver Node.js

```bash
cd Backend/cassandra-service
npm init -y
npm install express cors dotenv jsonwebtoken cassandra-driver axios
```

---

## Requirements

### R1: Esquema Cassandra — eventos_auditoria

The system MUST store every event as an immutable row.

Tabla: `eventos_auditoria`
| Columna | Tipo | Rol |
|---------|------|-----|
| `mes` | TEXT | Partition key (formato YYYY-MM) |
| `timestamp` | TIMESTAMP | Clustering key DESC |
| `id` | TIMEUUID | Clustering key |
| `tipo_evento` | TEXT | — |
| `usuario` | TEXT | — |
| `severidad` | TEXT | info \| warning \| critical |
| `metadata` | TEXT | JSON serializado |

#### Scenario: Insert evento

- GIVEN un evento ocurre en el sistema
- WHEN el servicio de auditoría lo registra
- THEN se INSERTA una fila con todos los campos
- AND `id` se genera como TIMEUUID para ordenamiento temporal

#### Scenario: Query por rango sin ALLOW FILTERING

- GIVEN filas en la tabla con distintos `mes` y `tipo_evento`
- WHEN consulto por `tipo_evento` Y rango de `timestamp` DENTRO de un `mes`
- THEN devuelve filas usando partition key (`mes`) + clustering (`timestamp`)
- AND la query NO usa ALLOW FILTERING

#### Scenario: Query cross-mes (edge case)

- GIVEN eventos distribuidos en varios meses
- WHEN el rango solicitado abarca múltiples meses
- THEN el servicio MUST ejecutar N queries (una por mes) y combinar resultados
- AND el cliente NO debe estar al tanto de esta partición

### R2: Esquema Cassandra — resumen_eventos

The system MUST maintain a daily event aggregation table for reports.

Tabla: `resumen_eventos`
| Columna | Tipo | Rol |
|---------|------|-----|
| `tipo_evento` | TEXT | Partition key |
| `fecha` | DATE | Clustering key |
| `total` | COUNTER | Conteo de eventos |
| `detalle` | TEXT | JSON: `{por_usuario: {...}, por_severidad: {...}}` |

#### Scenario: Agregación diaria

- GIVEN eventos ocurrieron durante el día
- WHEN se ejecuta el proceso de resumen (trigger post-insert o job)
- THEN se UPSERT una fila en `resumen_eventos`
- AND `total` se incrementa, `detalle` se actualiza con el JSON agregado

#### Scenario: Reporte por tipo y fecha

- GIVEN filas en `resumen_eventos`
- WHEN consulto por `tipo_evento = 'login_fallido'` AND `fecha = '2026-06-03'`
- THEN devuelve la fila agregada
- AND no requiere ALLOW FILTERING

### R3: API — POST /api/auditoria/eventos

The system MUST accept event writes. Requires `verificarToken` middleware.

#### Scenario: Evento válido

- GIVEN token JWT válido en `Authorization` header
- AND body `{tipo_evento, usuario, severidad, metadata}`
- WHEN POST /api/auditoria/eventos
- THEN responde 201 Created
- AND body `{mensaje: "Evento registrado", id: "<TIMEUUID>"}`

#### Scenario: Token inválido

- GIVEN token faltante o expirado
- WHEN POST /api/auditoria/eventos
- THEN responde 401 Unauthorized

#### Scenario: Cassandra caído

- GIVEN Cassandra no está disponible
- WHEN POST /api/auditoria/eventos
- THEN responde 503 Service Unavailable
- AND body `{error: "Servicio de auditoría no disponible"}`
- AND el monolito NO lanza excepción (ver R8)

#### Scenario: Body inválido (edge case)

- GIVEN body sin `tipo_evento` o `usuario`
- WHEN POST /api/auditoria/eventos
- THEN responde 400 Bad Request

### R4: API — GET /api/auditoria/eventos

The system MUST support filtered querying of events. Requires `verificarAdmin`.

Query params: `tipo` (obligatorio), `desde` (opcional, ISO), `hasta` (opcional, ISO), `limite` (opcional, default 100, max 1000).

#### Scenario: Por tipo y rango

- GIVEN `?tipo=login_fallido&desde=2026-06-01&hasta=2026-06-04`
- WHEN GET /api/auditoria/eventos
- THEN responde 200 OK
- AND body es un array de eventos ordenados por timestamp DESC

#### Scenario: Sin resultados

- GIVEN rango sin eventos
- WHEN GET /api/auditoria/eventos
- THEN responde 200 OK
- AND body `[]`

#### Scenario: Falta tipo (error)

- GIVEN query sin parámetro `tipo`
- WHEN GET /api/auditoria/eventos
- THEN responde 400 Bad Request
- AND body `{error: "El parámetro 'tipo' es obligatorio"}`

#### Scenario: Sin admin (edge case)

- GIVEN token de usuario regular (no admin)
- WHEN GET /api/auditoria/eventos
- THEN responde 403 Forbidden

### R5: API — GET /api/auditoria/reportes

The system MUST return aggregated reports from `resumen_eventos`. Requires `verificarAdmin`.

Query params: `tipo` (opcional), `fecha` (obligatorio, ISO).

#### Scenario: Reporte por tipo y fecha

- GIVEN `?tipo=modificacion_obra&fecha=2026-06-03`
- WHEN GET /api/auditoria/reportes
- THEN responde 200 OK
- AND body tiene `tipo_evento`, `fecha`, `total`, `detalle`

#### Scenario: Reporte global por fecha

- GIVEN `?fecha=2026-06-03` sin `tipo`
- WHEN GET /api/auditoria/reportes
- THEN responde 200 OK
- AND body es un array con todas las filas de `resumen_eventos` para esa fecha
- AND requiere ALLOW FILTERING o query por mes particionado

#### Scenario: Sin fecha (error)

- GIVEN query sin `fecha`
- WHEN GET /api/auditoria/reportes
- THEN responde 400 Bad Request

### R6: Disparo de Eventos desde el Monolito MySQL

The system MUST expose an internal helper function `auditar(tipo, usuario, severidad, metadata)` en el monolito (Backend/services/auditoriaHelper.js). Esta función hace HTTP POST al microservicio Cassandra.

#### Scenario: Login exitoso

- GIVEN usuario autentica credenciales correctas
- WHEN el monolito completa el login
- THEN llama a `auditar('login_exitoso', usuario, 'info', {})`

#### Scenario: Login fallido

- GIVEN credenciales incorrectas
- WHEN el monolito rechaza el login
- THEN llama a `auditar('login_fallido', usuario, 'warning', {intentos_seguidos: N})`

#### Scenario: Solicitud de compra

- GIVEN usuario solicita comprar una obra (estado obra → 🟡 reservada)
- WHEN el monolito registra la solicitud
- THEN llama a `auditar('solicitud_compra', usuario, 'info', {obra_id, precio})`
- AND genera un `solicitud_id` UUID para correlación

#### Scenario: Compra aceptada

- GIVEN admin acepta una solicitud de compra pendiente
- WHEN el monolito actualiza la obra a ✅ vendida
- THEN llama a `auditar('compra_aceptada', admin_id, 'info', {admin_id, solicitud_id})`

#### Scenario: Compra rechazada

- GIVEN admin rechaza una solicitud de compra
- WHEN el monolito actualiza obra de vuelta a disponible
- THEN llama a `auditar('compra_rechazada', admin_id, 'warning', {admin_id, motivo, solicitud_id})`

#### Scenario: Compra cancelada

- GIVEN una venta ya aprobada se cancela
- WHEN el monolito procesa la cancelación
- THEN llama a `auditar('compra_cancelada', admin_id, 'warning', {motivo})`

#### Scenario: Modificación de obra

- GIVEN admin crea, edita o elimina una obra
- WHEN la operación CRUD se completa
- THEN llama a `auditar('modificacion_obra', admin_id, 'info', {accion: 'crear'|'editar'|'eliminar'})`

#### Scenario: Modificación de artista

- GIVEN admin crea, edita o elimina un artista
- WHEN la operación CRUD se completa
- THEN llama a `auditar('modificacion_artista', admin_id, 'info', {accion: 'crear'|'editar'|'eliminar'})`

#### Scenario: Cambio de rol

- GIVEN admin cambia el rol de un usuario
- WHEN el cambio se persiste en MySQL
- THEN llama a `auditar('cambio_rol', admin_id, 'warning', {rol_anterior, rol_nuevo})`

#### Scenario: Error 500 interno

- GIVEN una excepción no capturada en el monolito
- WHEN el error ocurre
- THEN llama a `auditar('error_sistema', 'sistema', 'critical', {stacktrace: error.stack?.slice(0,1000)})`
- AND el stacktrace se trunca a 1000 caracteres máximo

#### Scenario: Cassandra caído no afecta al monolito

- GIVEN Cassandra no está disponible
- WHEN cualquier evento intenta dispararse
- THEN el helper `auditar()` captura el error con try/catch
- AND registra en `console.error("Auditoría no disponible:", error.message)`
- AND el monolito CONTINÚA su flujo normal SIN lanzar excepción al cliente
- AND el cliente nunca recibe un error 500 por causa de auditoría

### R7: Integridad y Restricciones

| ID | Regla |
|----|-------|
| R7.1 | KEYSPACE: `museo_auditoria`, SimpleStrategy, replication_factor=1 (dev) |
| R7.2 | MUST NOT usar ALLOW FILTERING en queries — todas usan partition key + clustering |
| R7.3 | Escritura requiere `verificarToken`, lectura requiere `verificarAdmin` |
| R7.4 | `solicitud_id` como UUID en metadata para correlacionar flujo de compra |
| R7.5 | Stacktrace en `error_sistema` truncado a 1000 caracteres máximo |
| R7.6 | El microservicio corre en puerto 3002 |
| R7.7 | Los eventos de compra siguen flujo: `solicitud_compra` 🟡 → `compra_aceptada` ✅ \| `compra_rechazada` ❌ |

---

## Eventos Registrables

| Tipo | Cuándo | Severidad | Metadata |
|------|--------|-----------|----------|
| `login_exitoso` | Login exitoso | info | — |
| `login_fallido` | Login fallido | warning | `intentos_seguidos` |
| `solicitud_compra` | Usuario solicita comprar obra 🟡 | info | `obra_id`, `precio` |
| `compra_aceptada` | Admin acepta solicitud ✅ | info | `admin_id`, `solicitud_id` |
| `compra_rechazada` | Admin rechaza solicitud ❌ | warning | `admin_id`, `motivo`, `solicitud_id` |
| `compra_cancelada` | Venta cancelada post-aprobación ↩️ | warning | `motivo` |
| `modificacion_obra` | CRUD obra por admin | info | `accion` (crear/editar/eliminar) |
| `modificacion_artista` | CRUD artista por admin | info | `accion` |
| `cambio_rol` | Admin cambia rol usuario | warning | `rol_anterior`, `rol_nuevo` |
| `error_sistema` | Error 500 interno | critical | `stacktrace` (truncado) |

---

## Resumen de Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | /api/auditoria/eventos | Token | Registrar evento |
| GET | /api/auditoria/eventos | Admin | Consultar eventos por tipo/rango |
| GET | /api/auditoria/reportes | Admin | Consultar resúmenes agregados |

---

## Tipos de Severidad

| Severidad | Significado |
|-----------|-------------|
| `info` | Eventos normales del sistema (logins exitosos, CRUD, solicitudes) |
| `warning` | Eventos que requieren atención (logins fallidos, cambios de rol, compras canceladas/rechazadas) |
| `critical` | Eventos graves (errores 500 internos) |
