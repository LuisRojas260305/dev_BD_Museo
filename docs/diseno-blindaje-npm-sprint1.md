# Diseño: Blindaje npm + Sprint 1 MongoDB (Delta)

> **Proyecto**: Museo - Base de Datos 2
> **Basado en**: `docs/diseno-tecnico-sprint1-mongodb.md` (diseño existente)
> **Propuesta**: sdd/blindaje-npm-sprint1/propose (#104)
> **Specs**: sdd/blindaje-npm-sprint1/spec (#105)

---

## Fase 1: Blindaje de Seguridad npm (NUEVO)

### Enfoque Técnico

Actualización controlada de dependencias del Backend monolítico (puerto 3000) para eliminar vulnerabilidades conocidas. Se usan rangos semver caret (`^`) para permitir patches automáticos, con `overrides` para forzar versiones seguras de dependencias transitivas (path-to-regexp). Sin cambios de API ni lógica de negocio.

### Decisiones de Arquitectura

| Decisión | Opciones | Tradeoff | Elegido |
|----------|----------|----------|---------|
| Version pinning | Exacta vs caret | Exacta evita surprises pero bloquea patches de seguridad automáticos | `^` caret - seguridad sin romper compatibilidad |
| ignore-scripts | `true` vs `false` | `true` elimina riesgo de supply chain pero rompe bcrypt (postinstall nativo) | `false` - bcrypt es crítico para auth y no tiene alternativa directa |
| path-to-regexp fix | overrides vs esperar Express 5.x | Express podría vender su copia, overrides no siempre funcionan en transitive vendor | Overrides - única opción hasta que Express publique 5.2.2+ |
| .npmrc / .gitignore | Raíz vs por servicio | Centralizado vs aislado | Por servicio - cada directorio es autocontenido, principio de isolación |

### Flujo de Datos

```
npm audit (antes) → version bumps → overrides → npm install → new lockfile → npm audit (después: 0 vulns)
                                                                              │
                                                                       Backend server start
                                                                              │
                                                                       Smoke test endpoints
```

### Cambios de Archivos

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `Backend/package.json` | Modificar | axios ^1.13.6→^1.16.1, multer ^2.1.0→^2.1.1, mysql2 ^3.17.2→^3.22.3 + overrides path-to-regexp >=8.4.0 |
| `Backend/package-lock.json` | Regenerar | `npm install` regenera lockfile con versiones seguras |
| `Backend/.npmrc` | Crear | `audit-level=high`, `engine-strict=true` (SIN ignore-scripts) |
| `Backend/.gitignore` | Crear | `node_modules/`, `.env`, `npm-debug.log*`, `.DS_Store` |

### Orden de Implementación

1. `Backend/package.json` - actualizar versiones + overrides
2. `Backend/.npmrc` - crear
3. `Backend/.gitignore` - crear
4. `npm install` en Backend/ - regenera lockfile
5. `npm audit --audit-level=high` - verificar 0 vulnerabilidades
6. Smoke test - arrancar server, probar endpoints existentes

### Rollback

```bash
git restore Backend/package.json Backend/package-lock.json
# .npmrc y .gitignore se pueden eliminar si es necesario
```

---

## Fase 2: Sprint 1 MongoDB (Delta del diseño existente)

### Enfoque Técnico

El diseño completo del Sprint 1 está documentado en `docs/diseno-tecnico-sprint1-mongodb.md` (390 líneas). Acá se documentan **solo los cambios** que introduce este cambio.

### Decisiones de Arquitectura (Delta)

| Decisión | Anterior (diseño base) | Nueva | Razón |
|----------|----------------------|-------|-------|
| mongoose version | ^8.14.0 | ^9.6.1 | v8 EOL Feb 2026, CVE-2026-42334 NoSQL injection fixeado en v9 |
| mysql2 version | ^3.17.2 | ^3.22.3 | Security fixes (OOB read, DoS, config injection) desde 3.19.1 |
| path-to-regexp | Sin overrides | >=8.4.0 | CVE-2026-4926 / CVE-2026-4923 - Express 5 transitiva |
| .npmrc | No existía | `audit-level=high`, `engine-strict=true` | Consistencia con Backend |
| .gitignore | No existía | node_modules/, .env, npm-debug.log*, .DS_Store | Consistencia con Backend |

### Cambios de Archivos (Delta)

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `Backend/mongodb-service/package.json` | Modificar deps | mongoose ^9.6.1, mysql2 ^3.22.3 + overrides path-to-regexp |
| `Backend/mongodb-service/.npmrc` | Crear | Misma configuración que Backend/.npmrc |
| `Backend/mongodb-service/.gitignore` | Crear | Misma configuración que Backend/.gitignore |

### Secciones NO Cambiadas

Todo lo siguiente permanece **IDÉNTICO** al diseño base:

- **Arquitectura**: Microservicio Express 5 en `Backend/mongodb-service/server.js`, puerto 3001, CommonJS
- **Conexión DB**: `config/db.js` (Mongoose pool min 2 / max 10, retry, graceful shutdown) + `config/mysql.js` (mysql2/promise para ETL)
- **Modelos**: `models/Artista.js` (schema con índices) + `models/Obra.js` (discriminatorKey 'genero', 5 discriminators: Pintura, Escultura, Orfebrería, Cerámica, Fotografía)
- **API**:
  - `GET /api/catalog` - $match + $facet para paginación con filtros (género, precio, estado)
  - `GET /api/catalog/:id` - resolución dual ObjectId / obra_id_original con $lookup
  - `GET /api/search?q=` - $text search con textScore y $sort
  - `GET /health` - readyState check
- **ETL**: `scripts/migrate.js` - 6 fases, batch 100, ordered: false
- **Seed**: `scripts/seed.js` - 5 obras + 3 artistas sin dependencia MySQL
- **Middleware**: `errorHandler.js` + `validation.js`
- **Frontend**: Feature flag en `auth.js`, adapters `cargarObras()` / `cargarObra()` en páginas
- **Manejo de errores**: Tabla completa de status 400/404/503

---

## Riesgos Técnicos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Mongoose 9.x rompe callbacks | Baja | Los controladores ya estaban diseñados con async/await |
| mysql2 3.22.3 incompatible con mysql2/promise | Muy baja | API de mysql2/promise no ha cambiado entre minors |
| path-to-regexp override no efectivo por vendor de Express | Media | Verificar con `npm ls path-to-regexp` post-install. Alternativa: esperar Express 5.2.2+ |
| bcrypt postinstall falla con engine-strict | Baja | engine-strict valida versión de Node.js (26.x), bcrypt soporta 26.x |
| npm audit reporta falsos positivos de path-to-regexp | Media | Algunas versiones >=8.4.0 pueden tener advisories no cerrados del todo. Verificar con `npm audit --json` |

---

## Próximos Pasos

1. Implementar Fase 1 (blindaje Backend)
2. Verificar server y endpoints existentes
3. Implementar Fase 2 (Sprint 1) con nuevas versiones de dependencias
4. Smoke test completo: `docs/smoke-test-sprint1.sh`

---

## Referencias

- Diseño base Sprint 1: `docs/diseno-tecnico-sprint1-mongodb.md`
- Propuesta: sdd/blindaje-npm-sprint1/propose (#104)
- Specs: sdd/blindaje-npm-sprint1/spec (#105)
- Exploración: sdd/blindaje-npm-sprint1/explore (#103)
