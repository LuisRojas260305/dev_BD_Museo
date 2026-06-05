# Tasks: Sprint 2 — Cassandra Auditoría

## Phase 1: Instalación de Cassandra (PC local)

- [ ] 1.1 Instalar JDK 17 si no está: `yay -S jdk17-openjdk` y verificar `$JAVA_HOME/bin/java -version`
- [ ] 1.2 Instalar Cassandra 5.0 desde AUR: `yay -S cassandra`
- [ ] 1.3 Arrancar servicio: `sudo systemctl start cassandra && sudo systemctl enable cassandra`
- [ ] 1.4 Verificar: `nodetool status` → debe mostrar UN en el cluster
- [ ] 1.5 Verificar CQL: `cqlsh localhost 9042 -e "SHOW VERSION"`

## Phase 2: Estructura del microservicio

- [ ] 2.1 Crear `Backend/cassandra-service/` con subdirectorios: `config/`, `controllers/`, `middleware/`, `models/`, `routes/`, `scripts/`
- [ ] 2.2 Crear `Backend/cassandra-service/package.json` con deps: express, cors, dotenv, jsonwebtoken, cassandra-driver, axios
- [ ] 2.3 Crear `Backend/cassandra-service/.env`: PORT=3002, CASSANDRA_CONTACT_POINTS=127.0.0.1, CASSANDRA_KEYSPACE=museo_auditoria, JWT_SECRET
- [ ] 2.4 Crear `Backend/cassandra-service/server.js` — Express app con cors, json, dotenv, placeholder routes y errorHandler
- [ ] 2.5 Ejecutar `npm install` en cassandra-service/
- [ ] 2.6 Verificar: `node server.js` arranca sin errores en puerto 3002

## Phase 3: Esquema CQL (Cassandra)

- [ ] 3.1 Crear `Backend/cassandra-service/scripts/schema.cql` — CREATE KEYSPACE museo_auditoria + tablas eventos_auditoria y resumen_eventos
- [ ] 3.2 Ejecutar schema: `cqlsh localhost 9042 -f scripts/schema.cql`
- [ ] 3.3 Verificar: `cqlsh -e "DESCRIBE KEYSPACE museo_auditoria"`

## Phase 4: Conexión Cassandra + Modelos

- [ ] 4.1 Crear `Backend/cassandra-service/config/cassandra.js` — Client con contactPoints, localDataCenter, keyspace, pooling, queryOptions (prepare:true, consistency:LOCAL_ONE)
- [ ] 4.2 Crear `Backend/cassandra-service/models/eventos.js` — registrarEvento, consultarEventos, obtenerEventoPorSolicitud (prepared statements)
- [ ] 4.3 Crear `Backend/cassandra-service/models/resumenes.js` — actualizarResumen (COUNTER), consultarResumenes
- [ ] 4.4 Crear `Backend/cassandra-service/init-db.js` — script que ejecuta schema.cql al arrancar con fs.readFileSync + client.execute
- [ ] 4.5 Verificar: require('./config/cassandra') conecta sin error

## Phase 5: Middleware + Rutas + Controladores

- [ ] 5.1 Copiar `Backend/shared/authMiddleware.js` → `Backend/cassandra-service/middleware/authMiddleware.js`
- [ ] 5.2 Crear `Backend/cassandra-service/middleware/errorHandler.js` — mismo patrón que mongodb-service
- [ ] 5.3 Crear `Backend/cassandra-service/controllers/auditoria.controller.js` — createEvent (POST), getEvents (GET), getReports (GET), healthCheck (GET)
- [ ] 5.4 Crear `Backend/cassandra-service/routes/auditoria.routes.js` — 4 endpoints con auth según spec
- [ ] 5.5 Montar rutas en server.js: `app.use('/api/auditoria', require('./routes/auditoria.routes'))` + errorHandler
- [ ] 5.6 Verificar: `curl localhost:3002/api/auditoria/health` → 200 OK

## Phase 6: Integración desde el Monolito

- [x] 6.1 Crear `Backend/services/auditoriaHelper.js` — función `auditar(tipo_evento, usuario, severidad, metadata)` con axios POST timeout 2s, fire-and-forget
- [x] 6.2 Agregar `auditar('login_exitoso'/'login_fallido')` en `controllers/Usuario/usuarioController.js` login
- [x] 6.3 Agregar `auditar()` en `controllers/Compra/ventaController.js` — solicitud_compra, compra_aceptada, compra_rechazada
- [x] 6.4 Agregar `auditar('modificacion_obra')` en `controllers/Obra/obraController.js` — create/update/delete
- [x] 6.5 Agregar `auditar('modificacion_artista')` en `controllers/Artista/artistasController.js` — create/update/delete
- [x] 6.6 Agregar `auditar('cambio_rol')` en `controllers/Usuario/usuarioController.js` — updateUsuario
- [x] 6.7 Agregar `auditar('error_sistema', 'sistema', 'critical')` en `app.js` error handler global
- [ ] 6.8 Verificar: login exitoso → consultar evento en Cassandra con `cqlsh`

## Phase 7: Smoke Test + Commit Final

- [ ] 7.1 Crear `Backend/cassandra-service/test-smoke.sh` — curl tests para health, POST evento, GET eventos, GET reportes
- [ ] 7.2 Ejecutar smoke test y verificar todos los endpoints
- [ ] 7.3 Commit final: `git add -A && git commit -m "feat: Sprint 2 - Cassandra auditoría service"`
