/**
 * Modelo del grafo de conocimiento del museo (Neo4j).
 *
 * Topología:
 *   (Comprador)-[:COMPRÓ]->(Obra)<-[:CREÓ]-(Artista)-[:TRABAJA_EN]->(Genero)
 *   (Obra)-[:PERTENECE_A]->(Genero)
 *
 * Todas las escrituras usan MERGE (idempotente) para que el seed y cada compra
 * en vivo puedan reejecutarse sin duplicar nodos ni aristas.
 */
const { run, neo4j } = require('../config/neo4j');

/** Convierte a entero Neo4j (claves usuario_id y parámetros LIMIT). */
function intParam(n) { return neo4j.int(parseInt(n, 10) || 0); }

// ---------------------------------------------------------------------------
// Upserts de nodos
// ---------------------------------------------------------------------------

/** Crea/actualiza un nodo Comprador. */
async function upsertComprador({ usuario_id, nombre, email }) {
    await run(
        `MERGE (c:Comprador {usuario_id: $usuario_id})
         SET c.nombre = $nombre, c.email = $email`,
        { usuario_id: intParam(usuario_id), nombre: nombre || '', email: email || '' },
        { mode: 'WRITE' }
    );
}

/** Crea/actualiza un nodo Obra y su relación con el Género. */
async function upsertObra({ obra_id, nombre, genero, precio, estado }) {
    await run(
        `MERGE (o:Obra {obra_id: $obra_id})
           SET o.nombre = $nombre, o.genero = $genero,
               o.precio = $precio, o.estado = $estado
         WITH o, $genero AS gnombre
         WHERE gnombre IS NOT NULL AND gnombre <> ''
         MERGE (g:Genero {nombre: gnombre})
         MERGE (o)-[:PERTENECE_A]->(g)`,
        {
            obra_id: String(obra_id),
            nombre: nombre || 'Sin título',
            genero: genero || '',
            precio: precio != null ? Number(precio) : 0,
            estado: estado || 'Disponible',
        },
        { mode: 'WRITE' }
    );
}

/**
 * Crea/actualiza un nodo Artista, lo enlaza a la Obra (CREÓ) y al Género
 * en que trabaja (TRABAJA_EN). La obra debe existir previamente.
 */
async function upsertArtista({ artista_id, nombre, nacionalidad, obra_id, genero }) {
    await run(
        `MERGE (a:Artista {artista_id: $artista_id})
           SET a.nombre = $nombre, a.nacionalidad = $nacionalidad
         WITH a
         OPTIONAL MATCH (o:Obra {obra_id: $obra_id})
         FOREACH (_ IN CASE WHEN o IS NULL THEN [] ELSE [1] END |
           MERGE (a)-[:CREÓ]->(o))
         WITH a, $genero AS gnombre
         WHERE gnombre IS NOT NULL AND gnombre <> ''
         MERGE (g:Genero {nombre: gnombre})
         MERGE (a)-[:TRABAJA_EN]->(g)`,
        {
            artista_id: String(artista_id),
            nombre: nombre || 'Desconocido',
            nacionalidad: nacionalidad || '',
            obra_id: obra_id != null ? String(obra_id) : '',
            genero: genero || '',
        },
        { mode: 'WRITE' }
    );
}

// ---------------------------------------------------------------------------
// Relación de compra (núcleo de la integración con el flujo de venta SQL)
// ---------------------------------------------------------------------------

/**
 * Registra una compra en el grafo: asegura los nodos Comprador y Obra y crea la
 * arista (Comprador)-[:COMPRÓ]->(Obra). Idempotente por venta_id.
 * @returns {Promise<Object>} Resumen { comprador, obra }
 */
async function registrarCompra({ usuario_id, comprador_nombre, comprador_email, obra_id, obra_nombre, genero, precio, venta_id, fecha }) {
    const rows = await run(
        `MERGE (c:Comprador {usuario_id: $usuario_id})
           ON CREATE SET c.nombre = $comprador_nombre, c.email = $comprador_email
           ON MATCH  SET c.nombre = coalesce(c.nombre, $comprador_nombre),
                         c.email  = coalesce(c.email,  $comprador_email)
         MERGE (o:Obra {obra_id: $obra_id})
           ON CREATE SET o.nombre = $obra_nombre, o.genero = $genero
         SET o.estado = 'Vendida'
         FOREACH (_ IN CASE WHEN $genero <> '' THEN [1] ELSE [] END |
           MERGE (g:Genero {nombre: $genero})
           MERGE (o)-[:PERTENECE_A]->(g))
         MERGE (c)-[r:COMPRÓ]->(o)
           ON CREATE SET r.venta_id = $venta_id, r.fecha = $fecha, r.precio = $precio
         RETURN c.usuario_id AS comprador, o.obra_id AS obra`,
        {
            usuario_id: intParam(usuario_id),
            comprador_nombre: comprador_nombre || '',
            comprador_email: comprador_email || '',
            obra_id: String(obra_id),
            obra_nombre: obra_nombre || 'Sin título',
            genero: genero || '',
            precio: precio != null ? Number(precio) : 0,
            venta_id: venta_id != null ? intParam(venta_id) : null,
            fecha: fecha || new Date().toISOString(),
        },
        { mode: 'WRITE' }
    );
    return rows[0] || {};
}

// ---------------------------------------------------------------------------
// Consultas de recomendación (entregable principal del Sprint 3)
// ---------------------------------------------------------------------------

/**
 * Recomienda obras DISPONIBLES del mismo género que las que el usuario compró,
 * excluyendo las que ya posee. Ordena por cuántas compras del usuario coinciden
 * con cada género (afinidad) y luego por precio.
 * "Muéstrame obras del mismo género que compré".
 */
async function recomendarPorGenero(usuario_id, limite = 10) {
    return run(
        `MATCH (c:Comprador {usuario_id: $usuario_id})-[:COMPRÓ]->(:Obra)-[:PERTENECE_A]->(g:Genero)
         WITH c, g, count(*) AS afinidad
         MATCH (g)<-[:PERTENECE_A]-(rec:Obra)
         WHERE rec.estado = 'Disponible' AND NOT (c)-[:COMPRÓ]->(rec)
         OPTIONAL MATCH (autor:Artista)-[:CREÓ]->(rec)
         RETURN rec.obra_id   AS obra_id,
                rec.nombre     AS nombre,
                g.nombre       AS genero,
                rec.precio     AS precio,
                autor.nombre   AS artista,
                afinidad       AS afinidad_genero
         ORDER BY afinidad_genero DESC, rec.precio ASC
         LIMIT $limite`,
        { usuario_id: intParam(usuario_id), limite: intParam(limite) }
    );
}

/**
 * Recomienda otras obras DISPONIBLES de los mismos artistas que el usuario ya
 * compró ("más de los artistas que te gustan").
 */
async function recomendarPorArtista(usuario_id, limite = 10) {
    return run(
        `MATCH (c:Comprador {usuario_id: $usuario_id})-[:COMPRÓ]->(:Obra)<-[:CREÓ]-(a:Artista)
         WITH c, a, count(*) AS compras_artista
         MATCH (a)-[:CREÓ]->(rec:Obra)
         WHERE rec.estado = 'Disponible' AND NOT (c)-[:COMPRÓ]->(rec)
         RETURN rec.obra_id AS obra_id,
                rec.nombre  AS nombre,
                rec.genero  AS genero,
                rec.precio  AS precio,
                a.nombre    AS artista,
                compras_artista AS afinidad_artista
         ORDER BY afinidad_artista DESC, rec.precio ASC
         LIMIT $limite`,
        { usuario_id: intParam(usuario_id), limite: intParam(limite) }
    );
}

/**
 * Recomendación colaborativa simple: "compradores que adquirieron lo mismo que
 * tú también compraron...". Cuenta vecinos a 2 saltos.
 */
async function recomendarColaborativo(usuario_id, limite = 10) {
    return run(
        `MATCH (c:Comprador {usuario_id: $usuario_id})-[:COMPRÓ]->(:Obra)<-[:COMPRÓ]-(otro:Comprador)
         WHERE otro <> c
         MATCH (otro)-[:COMPRÓ]->(rec:Obra)
         WHERE rec.estado = 'Disponible' AND NOT (c)-[:COMPRÓ]->(rec)
         RETURN rec.obra_id AS obra_id,
                rec.nombre  AS nombre,
                rec.genero  AS genero,
                rec.precio  AS precio,
                count(DISTINCT otro) AS coincidencias
         ORDER BY coincidencias DESC, rec.precio ASC
         LIMIT $limite`,
        { usuario_id: intParam(usuario_id), limite: intParam(limite) }
    );
}

/** Obras más compradas del museo (ranking global por número de aristas COMPRÓ). */
async function obrasPopulares(limite = 10) {
    return run(
        `MATCH (o:Obra)<-[r:COMPRÓ]-(:Comprador)
         RETURN o.obra_id AS obra_id, o.nombre AS nombre, o.genero AS genero,
                count(r) AS compras
         ORDER BY compras DESC
         LIMIT $limite`,
        { limite: intParam(limite) }
    );
}

/** Baraja un arreglo in-place (Fisher-Yates). */
function barajar(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Perfil del comprador: géneros y artistas que ha adquirido. Sirve para armar
 * un mensaje dinámico en el frontend.
 */
async function perfilComprador(usuario_id) {
    const rows = await run(
        `MATCH (c:Comprador {usuario_id: $usuario_id})-[:COMPRÓ]->(o:Obra)
         OPTIONAL MATCH (o)-[:PERTENECE_A]->(g:Genero)
         OPTIONAL MATCH (a:Artista)-[:CREÓ]->(o)
         RETURN [x IN collect(DISTINCT g.nombre) WHERE x IS NOT NULL] AS generos,
                [x IN collect(DISTINCT a.nombre) WHERE x IS NOT NULL] AS artistas,
                count(DISTINCT o) AS compras`,
        { usuario_id: intParam(usuario_id) }
    );
    return rows[0] || { generos: [], artistas: [], compras: 0 };
}

/**
 * Recomienda obras disponibles de UN género concreto (todas del mismo género),
 * en orden aleatorio para que varíen entre visitas.
 */
async function recomendarDeGenero(usuario_id, genero, limite = 12) {
    return run(
        `MATCH (c:Comprador {usuario_id: $usuario_id})
         MATCH (:Genero {nombre: $genero})<-[:PERTENECE_A]-(rec:Obra)
         WHERE rec.estado = 'Disponible' AND NOT (c)-[:COMPRÓ]->(rec)
         OPTIONAL MATCH (autor:Artista)-[:CREÓ]->(rec)
         RETURN rec.obra_id AS obra_id, rec.nombre AS nombre, $genero AS genero,
                rec.precio AS precio, autor.nombre AS artista
         ORDER BY rand()
         LIMIT $limite`,
        { usuario_id: intParam(usuario_id), genero, limite: intParam(limite) }
    );
}

/**
 * Recomienda obras disponibles de UN artista concreto (todas del mismo autor),
 * en orden aleatorio para que varíen entre visitas.
 */
async function recomendarDeArtista(usuario_id, artista, limite = 12) {
    return run(
        `MATCH (c:Comprador {usuario_id: $usuario_id})
         MATCH (a:Artista {nombre: $artista})-[:CREÓ]->(rec:Obra)
         WHERE rec.estado = 'Disponible' AND NOT (c)-[:COMPRÓ]->(rec)
         RETURN rec.obra_id AS obra_id, rec.nombre AS nombre, rec.genero AS genero,
                rec.precio AS precio, a.nombre AS artista
         ORDER BY rand()
         LIMIT $limite`,
        { usuario_id: intParam(usuario_id), artista, limite: intParam(limite) }
    );
}

/**
 * Recomendación VARIADA y coherente: elige un único tema al azar de entre los
 * gustos del comprador (un género suyo, un artista suyo, o colaborativo) y
 * devuelve obras de ese mismo tema, barajadas. Así cada visita muestra un tema
 * distinto y obras distintas, pero internamente coherente: si es género, todo
 * el mismo género; si es artista, todo el mismo artista; solo el colaborativo
 * mezcla. Devuelve { tema, recomendaciones }.
 */
async function recomendarVariado(usuario_id, limite = 12) {
    const perfil = await perfilComprador(usuario_id);

    // Posibles temas: cada género comprado, cada artista comprado, y colaborativo.
    const opciones = [];
    (perfil.generos  || []).forEach(g => opciones.push({ tipo: 'genero',  valor: g }));
    (perfil.artistas || []).forEach(a => opciones.push({ tipo: 'artista', valor: a }));
    opciones.push({ tipo: 'colaborativo' });
    barajar(opciones); // el tema que toca cambia en cada visita

    // Se prueba tema por tema hasta encontrar uno que tenga obras que sugerir.
    for (const op of opciones) {
        let recs = [];
        if (op.tipo === 'genero') {
            recs = (await recomendarDeGenero(usuario_id, op.valor, limite))
                .map(r => ({ ...r, fuente: 'genero', motivo: `Del género ${op.valor}` }));
        } else if (op.tipo === 'artista') {
            recs = (await recomendarDeArtista(usuario_id, op.valor, limite))
                .map(r => ({ ...r, fuente: 'artista', motivo: `Del artista ${op.valor}` }));
        } else {
            recs = barajar(await recomendarColaborativo(usuario_id, limite))
                .map(r => ({ ...r, fuente: 'colaborativo', motivo: 'Elegida por coleccionistas como tú' }));
        }
        if (recs.length) return { tema: op, recomendaciones: recs };
    }
    return { tema: null, recomendaciones: [] };
}

// ---------------------------------------------------------------------------
// Consultas de inspección (panel admin)
// ---------------------------------------------------------------------------

/** Conteos globales de nodos y relaciones. */
async function estadisticas() {
    const rows = await run(
        `RETURN
           count { (:Comprador) } AS compradores,
           count { (:Obra) }      AS obras,
           count { (:Artista) }   AS artistas,
           count { (:Genero) }    AS generos,
           count { ()-[:COMPRÓ]->() }      AS compras,
           count { ()-[:CREÓ]->() }        AS creaciones,
           count { ()-[:PERTENECE_A]->() } AS pertenencias,
           count { ()-[:TRABAJA_EN]->() }  AS trabaja_en`
    );
    return rows[0] || {};
}

/** Distribución de obras por género (para gráfico de barras del panel). */
async function obrasPorGenero() {
    return run(
        `MATCH (g:Genero)<-[:PERTENECE_A]-(o:Obra)
         RETURN g.nombre AS genero, count(o) AS total
         ORDER BY total DESC`
    );
}

/**
 * Devuelve un subgrafo (nodos + aristas) para visualización en el panel admin.
 * Limitado para no saturar el render.
 */
async function grafoVisual(limite = 75) {
    return run(
        `MATCH (n)-[r]->(m)
         RETURN
           elementId(n) AS origen_id, head(labels(n)) AS origen_tipo,
           coalesce(n.nombre, toString(n.usuario_id), n.obra_id, '') AS origen_label,
           type(r) AS relacion,
           elementId(m) AS destino_id, head(labels(m)) AS destino_tipo,
           coalesce(m.nombre, toString(m.usuario_id), m.obra_id, '') AS destino_label
         LIMIT $limite`,
        { limite: intParam(limite) }
    );
}

/** Ejecuta Cypher arbitrario (consola del panel admin). */
async function consultaLibre(cypher, params = {}) {
    return run(cypher, params);
}

/** Borra TODO el grafo (acción destructiva del panel). */
async function borrarGrafo() {
    await run('MATCH (n) DETACH DELETE n', {}, { mode: 'WRITE' });
}

module.exports = {
    upsertComprador, upsertObra, upsertArtista, registrarCompra,
    recomendarPorGenero, recomendarPorArtista, recomendarColaborativo,
    recomendarDeGenero, recomendarDeArtista, recomendarVariado,
    perfilComprador, obrasPopulares,
    estadisticas, obrasPorGenero, grafoVisual, consultaLibre, borrarGrafo,
};
