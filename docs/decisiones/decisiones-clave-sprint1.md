# Decisiones Clave — Sprint 1 (MongoDB)

> Registro de decisiones arquitectónicas y técnicas del Sprint 1.
> Formato: ADR (Architecture Decision Record) ligero.

---

## ADR-001: MongoDB como motor documental para el catálogo

**Estado**: Aceptada ✅  
**Contexto**: El catálogo de obras tiene atributos heterogéneos según género
(pintura, escultura, fotografía, cerámica, orfebrería). En MySQL esto requiere
herencia table-per-type con 5 subtablas y múltiples JOINs.  
**Decisión**: Usar MongoDB con documentos embebidos para almacenar el catálogo.
El campo `detalles` es polimórfico según el valor de `genero`.  
**Consecuencias**: 
- Consultas de catálogo pasan de N+1 JOINs a 0 JOINs
- Mayor uso de disco por desnormalización (aceptable para catálogo)
- El equipo debe aprender Aggregation Framework

---

## ADR-002: Microservicio independiente (no embebido en el monolito)

**Estado**: Aceptada ✅  
**Contexto**: El proyecto actual es un monolito Express 5 en puerto 3000.
El PDF de BD2 exige microservicios independientes.  
**Decisión**: Crear `Backend/mongodb-service/` como proyecto Node.js independiente
con su propio `package.json`, puerto 3001, y ciclo de vida propio.  
**Consecuencias**:
- Despliegue independiente del monolito
- Cada servicio puede escalarse por separado
- Complejidad operativa adicional (2 procesos en vez de 1)

---

## ADR-003: Mongoose con discriminators por género

**Estado**: Aceptada ✅  
**Contexto**: Necesitamos un schema que valide los campos de cada género
sin perder la flexibilidad del modelo documental.  
**Decisión**: Usar Mongoose con un schema base `Obra` que define los campos
comunes, y `discriminator()` para cada género (Pintura, Escultura, etc.)
que agrega los campos específicos en `detalles`.  
**Consecuencias**:
- Validación automática por género
- Type-safety en las consultas
- Curva de aprendizaje de Mongoose discriminators

---

## ADR-004: Fotos como URLs, no como BinData

**Estado**: Aceptada ✅  
**Contexto**: El documento original X.docx propone `foto: BinData`. MongoDB
tiene un límite de 16MB por documento. Las fotas en el monolito ya se sirven
vía `/uploads/`.  
**Decisión**: Almacenar `fotos: [String]` con URLs relativas al monolito.
Las imágenes se sirven desde Express (monolito) en `/uploads/`.  
**Consecuencias**:
- Documentos livianos (solo strings)
- Sin riesgo de exceder 16MB
- Dependencia del monolito para servir imágenes

---

## ADR-005: Embedding de artista con referencia dual

**Estado**: Aceptada ✅  
**Contexto**: Los datos del artista (nombre, apellido, nacionalidad) se muestran
siempre junto con la obra en el catálogo. Pero también se necesita acceder
al documento completo del artista para biografías, updates, etc.  
**Decisión**: Embeker un subdocumento `artista` con la información esencial
dentro de cada obra, y mantener el campo `artista_id` (ObjectId) que referencia
la colección `artistas`.  
**Consecuencias**:
- Lecturas rápidas sin `$lookup` (99% de los casos)
- Updates del artista maestro no requieren modificar obras
- 2x almacenamiento de datos de artista (aceptable por la ganancia en lecturas)

---

## ADR-006: ETL batch como estrategia de migración

**Estado**: Aceptada ✅  
**Contexto**: Hay datos existentes en MySQL que deben migrarse a MongoDB.
No hay writes concurrentes — la migración es única.  
**Decisión**: Script Node.js independiente `scripts/migrate.js` que:
1. Lee MySQL con `mysql2/promise`
2. Arma los documentos con la estructura MongoDB
3. Inserta en batches de 100 con `insertMany({ ordered: false })`
4. Crea índices al final  
**Consecuencias**:
- Migración atómica (se puede reiniciar si falla)
- No requiere downtime del monolito
- Si hay muchas obras (>10k), el batch puede tomar minutos

---

## ADR-007: `$text` index para búsqueda full-text

**Estado**: Aceptada ✅  
**Contexto**: El endpoint `/api/catalog/search` debe buscar obras por
nombre y descripción. Alternativas: `$regex` (full-scan) vs `$text` (índice invertido).  
**Decisión**: Crear índice `{ nombre: "text", descripcion: "text" }` y usar
`$text: { $search }` con scoring por `textScore`.  
**Consecuencias**:
- Búsquedas rápidas incluso con miles de documentos
- Ranking por relevancia
- No soporta stemming en español out-of-the-box (aceptable)

---

## ADR-008: `$facet` para paginación con conteo total

**Estado**: Aceptada ✅  
**Contexto**: El catálogo necesita paginación (page/limit) + conteo total
de resultados para mostrar "página X de Y". Alternativas: dos consultas
(count + find) vs una pipeline con `$facet`.  
**Decisión**: Usar `$facet` en una sola pipeline de agregación que devuelve
`{ metadata: [{ total: N }], data: [...] }`.  
**Consecuencias**:
- Una sola operación a MongoDB
- Resultado exacto (consistente entre count y data)
- Ligeramente más overhead que un `find()` simple (aceptable)

---

## ADR-009: Feature flag en frontend para fallback

**Estado**: Aceptada ✅  
**Contexto**: Si el servicio MongoDB cae, el frontend debe seguir funcionando
consultando al monolito MySQL.  
**Decisión**: El frontend hace un `GET /api/catalog/health` al inicio.
Si responde 200 → usa MongoDB. Si no responde → usa MySQL.  
**Consecuencias**:
- Zero cambios en infraestructura
- El usuario nunca ve errores de conexión
- Latencia inicial aumentada en 1 health check (<100ms)

---

## ADR-010: `genero` como discriminador semántico

**Estado**: Aceptada ✅  
**Contexto**: El discriminador del schema polimórfico podía llamarse "tipo"
(generic) o "genero" (domain-specific).  
**Decisión**: Usar `genero: "Pintura" | "Escultura" | "Orfebrería" | "Cerámica" | "Fotografía"`.
Valores en español, alineados con el dominio del museo.  
**Consecuencias**:
- Código más legible y autodocumentado
- URLs más semánticas: `/api/catalog?genero=Pintura`
- Consistente con el nombre del género en MySQL
