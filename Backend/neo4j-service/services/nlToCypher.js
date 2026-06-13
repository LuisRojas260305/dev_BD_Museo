/**
 * Traductor de Lenguaje Natural a Cypher (Reto de Innovación +5%).
 *
 * Convierte preguntas en español sobre el museo en consultas Cypher de SOLO
 * LECTURA, listas para ejecutarse en el grafo de recomendaciones.
 *
 * Dos motores:
 *   1. Reglas (por defecto): un analizador determinista que reconoce las
 *      intenciones más comunes y arma Cypher parametrizado y seguro. No
 *      requiere conexión a internet ni claves.
 *   2. IA (opcional): si existe ANTHROPIC_API_KEY, usa el modelo Claude para
 *      cubrir frases libres; la salida se valida para garantizar que sea de
 *      solo lectura antes de devolverla.
 *
 * Ejemplo: "Muéstrame obras del mismo género que compré"
 *   -> MATCH (c:Comprador {usuario_id:$usuario_id})-[:COMPRÓ]->(:Obra)
 *      -[:PERTENECE_A]->(g)<-[:PERTENECE_A]-(rec:Obra) ...
 */

const neo4j = require('neo4j-driver');
/** Convierte a entero Neo4j (Cypher exige enteros en LIMIT y claves usuario_id). */
function ent(n) { return neo4j.int(parseInt(n, 10) || 0); }

// Géneros válidos del museo (para detectarlos en el texto, sin acentos).
const GENEROS = [
    { canon: 'Pintura',     claves: ['pintura', 'pinturas'] },
    { canon: 'Escultura',   claves: ['escultura', 'esculturas'] },
    { canon: 'Orfebrería',  claves: ['orfebreria', 'orfebrerias'] },
    { canon: 'Cerámica',    claves: ['ceramica', 'ceramicas'] },
    { canon: 'Fotografía',  claves: ['fotografia', 'fotografias', 'foto', 'fotos'] },
    { canon: 'Cristalería', claves: ['cristaleria', 'cristalerias', 'vidrio'] },
    { canon: 'Textil',      claves: ['textil', 'textiles'] },
    { canon: 'Grabado',     claves: ['grabado', 'grabados'] },
    { canon: 'Acuarela',    claves: ['acuarela', 'acuarelas'] },
];

/** Normaliza: minúsculas y sin acentos, para comparar de forma robusta. */
function normalizar(texto) {
    return (texto || '')
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .trim();
}

/** Extrae un número de la frase (ej. "menos de 5000" -> 5000). */
function extraerNumero(texto) {
    const m = texto.replace(/[.,](?=\d{3}\b)/g, '').match(/(\d[\d]*)/);
    return m ? parseInt(m[1], 10) : null;
}

/** Detecta el género mencionado en la frase, si lo hay. */
function detectarGenero(norm) {
    for (const g of GENEROS) {
        if (g.claves.some(k => new RegExp(`\\b${k}\\b`).test(norm))) return g.canon;
    }
    return null;
}

/**
 * Traduce por reglas. Devuelve { cypher, params, intent, explicacion } o null
 * si ninguna regla coincide.
 * @param {string} texto - Pregunta en lenguaje natural.
 * @param {Object} [ctx] - Contexto, ej. { usuario_id }.
 */
function traducirPorReglas(texto, ctx = {}) {
    const norm = normalizar(texto);
    const usuario_id = ctx.usuario_id != null ? Number(ctx.usuario_id) : null;
    const limite = extraerNumero((norm.match(/(?:top|primeras?|primeros?)\s+\d+/) || [''])[0]) || 10;

    const genero = detectarGenero(norm);
    const pideRecomendacion = /\b(recomi[eé]ndame|recomendacion|recomienda|suger|que me recomiendas|para mi)\b/.test(norm);
    const mismoArtista = /(mismo|igual)\s+artista|del artista que (compre|adquiri)|del mismo autor/.test(norm);
    const mismoGenero = /(mismo|igual)\s+genero|del genero que (compre|adquiri)|como (la|las|lo) que compre/.test(norm);
    const colaborativo = /(otros|coleccionistas|gente|usuarios|personas) (como|igual que|parecidos)|tambien compraron|quienes compraron/.test(norm);
    const populares = /(mas|las mas) (compradas|vendidas|populares)|populares|mas comprada|top (de )?obras|exitos/.test(norm);
    const disponibles = /\b(disponible|disponibles|en venta|a la venta|se pueden? comprar)\b/.test(norm);

    // --- Intenciones personalizadas (requieren usuario) -----------------
    // El artista se evalúa primero: es más específico que la recomendación genérica.
    if (mismoArtista && usuario_id != null) {
        return {
            intent: 'recomendar_mismo_artista',
            explicacion: 'Otras obras disponibles de los artistas que el usuario ha comprado.',
            params: { usuario_id: ent(usuario_id), limite: ent(limite) },
            cypher:
`MATCH (c:Comprador {usuario_id: $usuario_id})-[:COMPRÓ]->(:Obra)<-[:CREÓ]-(a:Artista)
MATCH (a)-[:CREÓ]->(rec:Obra)
WHERE rec.estado = 'Disponible' AND NOT (c)-[:COMPRÓ]->(rec)
RETURN rec.nombre AS obra, a.nombre AS artista, rec.genero AS genero, rec.precio AS precio
ORDER BY rec.precio ASC
LIMIT $limite`,
        };
    }

    if ((mismoGenero || (pideRecomendacion && !genero)) && usuario_id != null) {
        return {
            intent: 'recomendar_mismo_genero',
            explicacion: 'Obras disponibles del mismo género que el usuario ha comprado.',
            params: { usuario_id: ent(usuario_id), limite: ent(limite) },
            cypher:
`MATCH (c:Comprador {usuario_id: $usuario_id})-[:COMPRÓ]->(:Obra)-[:PERTENECE_A]->(g:Genero)
WITH c, g, count(*) AS afinidad
MATCH (g)<-[:PERTENECE_A]-(rec:Obra)
WHERE rec.estado = 'Disponible' AND NOT (c)-[:COMPRÓ]->(rec)
OPTIONAL MATCH (autor:Artista)-[:CREÓ]->(rec)
RETURN rec.nombre AS obra, g.nombre AS genero, autor.nombre AS artista, rec.precio AS precio
ORDER BY afinidad DESC, rec.precio ASC
LIMIT $limite`,
        };
    }

    if (colaborativo && usuario_id != null) {
        return {
            intent: 'recomendar_colaborativo',
            explicacion: 'Obras que compraron otros coleccionistas con gustos parecidos.',
            params: { usuario_id: ent(usuario_id), limite: ent(limite) },
            cypher:
`MATCH (c:Comprador {usuario_id: $usuario_id})-[:COMPRÓ]->(:Obra)<-[:COMPRÓ]-(otro:Comprador)
WHERE otro <> c
MATCH (otro)-[:COMPRÓ]->(rec:Obra)
WHERE rec.estado = 'Disponible' AND NOT (c)-[:COMPRÓ]->(rec)
RETURN rec.nombre AS obra, rec.genero AS genero, rec.precio AS precio, count(DISTINCT otro) AS coincidencias
ORDER BY coincidencias DESC
LIMIT $limite`,
        };
    }

    // --- Obras más populares -------------------------------------------
    if (populares) {
        return {
            intent: 'obras_populares',
            explicacion: 'Obras con más compras registradas en el grafo.',
            params: { limite: ent(limite) },
            cypher:
`MATCH (o:Obra)<-[r:COMPRÓ]-(:Comprador)
RETURN o.nombre AS obra, o.genero AS genero, count(r) AS compras
ORDER BY compras DESC
LIMIT $limite`,
        };
    }

    // --- Precio (menos de / más de) ------------------------------------
    const menos = /(menos de|por debajo de|mas baratas? que|hasta|bajo)\s*\$?\s*\d/.test(norm);
    const mas   = /(mas de|por encima de|mas caras? que|arriba de|superior a)\s*\$?\s*\d/.test(norm);
    if (menos || mas) {
        const precio = extraerNumero(norm.replace(/\b(top|primeras?|primeros?)\s+\d+/, ''));
        const op = mas ? '>=' : '<=';
        const filtroGenero = genero ? ' AND o.genero = $genero' : '';
        return {
            intent: 'obras_por_precio',
            explicacion: `Obras disponibles ${mas ? 'desde' : 'hasta'} ${precio}${genero ? ' del género ' + genero : ''}.`,
            params: { precio: ent(precio || 0), limite: ent(limite), ...(genero ? { genero } : {}) },
            cypher:
`MATCH (o:Obra)
WHERE o.estado = 'Disponible' AND o.precio ${op} $precio${filtroGenero}
OPTIONAL MATCH (a:Artista)-[:CREÓ]->(o)
RETURN o.nombre AS obra, o.genero AS genero, a.nombre AS artista, o.precio AS precio
ORDER BY o.precio ${mas ? 'DESC' : 'ASC'}
LIMIT $limite`,
        };
    }

    // --- Obras de un artista concreto ("obras de Picasso") -------------
    const mArtista = norm.match(/(?:obras?|piezas?|cuadros?|trabajos?)\s+(?:de|del artista|por)\s+([a-z0-9 .'-]{3,40})$/);
    if (mArtista && !genero) {
        // Recupera el nombre original (con mayúsculas/acentos) del texto crudo.
        const idx = normalizar(texto).indexOf(mArtista[1]);
        const original = texto.slice(idx, idx + mArtista[1].length).trim();
        return {
            intent: 'obras_de_artista',
            explicacion: `Obras del artista "${original}".`,
            params: { artista: original, limite: ent(limite) },
            cypher:
`MATCH (a:Artista)-[:CREÓ]->(o:Obra)
WHERE toLower(a.nombre) CONTAINS toLower($artista)
RETURN o.nombre AS obra, a.nombre AS artista, o.genero AS genero, o.precio AS precio, o.estado AS estado
ORDER BY o.precio ASC
LIMIT $limite`,
        };
    }

    // --- Obras de un género (con o sin "disponibles") ------------------
    if (genero) {
        const filtroEstado = disponibles ? " AND o.estado = 'Disponible'" : '';
        return {
            intent: 'obras_de_genero',
            explicacion: `Obras del género ${genero}${disponibles ? ' disponibles' : ''}.`,
            params: { genero, limite: ent(limite) },
            cypher:
`MATCH (o:Obra)-[:PERTENECE_A]->(:Genero {nombre: $genero})
WHERE true${filtroEstado}
OPTIONAL MATCH (a:Artista)-[:CREÓ]->(o)
RETURN o.nombre AS obra, a.nombre AS artista, o.precio AS precio, o.estado AS estado
ORDER BY o.precio ASC
LIMIT $limite`,
        };
    }

    // --- Conteos --------------------------------------------------------
    if (/cuant[ao]s?\s+(obras|cuadros|piezas)/.test(norm)) {
        return {
            intent: 'contar_obras',
            explicacion: 'Número total de obras en el grafo.',
            params: {},
            cypher: 'MATCH (o:Obra) RETURN count(o) AS total_obras',
        };
    }
    if (/cuant[ao]s?\s+artistas/.test(norm)) {
        return {
            intent: 'contar_artistas',
            explicacion: 'Número total de artistas en el grafo.',
            params: {},
            cypher: 'MATCH (a:Artista) RETURN count(a) AS total_artistas',
        };
    }
    if (/cuant[ao]s?\s+(compradores|coleccionistas|clientes)/.test(norm)) {
        return {
            intent: 'contar_compradores',
            explicacion: 'Número total de compradores en el grafo.',
            params: {},
            cypher: 'MATCH (c:Comprador) RETURN count(c) AS total_compradores',
        };
    }

    // --- Solo "disponibles" sin género ---------------------------------
    if (disponibles) {
        return {
            intent: 'obras_disponibles',
            explicacion: 'Obras disponibles para la venta.',
            params: { limite: ent(limite) },
            cypher:
`MATCH (o:Obra)
WHERE o.estado = 'Disponible'
OPTIONAL MATCH (a:Artista)-[:CREÓ]->(o)
RETURN o.nombre AS obra, o.genero AS genero, a.nombre AS artista, o.precio AS precio
ORDER BY o.precio ASC
LIMIT $limite`,
        };
    }

    return null;
}

/** Palabras clave de escritura que NO se permiten en consultas generadas. */
const ESCRITURA = /\b(CREATE|MERGE|DELETE|DETACH|SET|REMOVE|DROP|FOREACH|LOAD\s+CSV|CALL\s*\{)\b/i;

/** Valida que un Cypher sea de solo lectura. Lanza si detecta escritura. */
function validarSoloLectura(cypher) {
    if (ESCRITURA.test(cypher)) {
        throw new Error('La consulta generada contiene operaciones de escritura y fue rechazada.');
    }
    return cypher;
}

/**
 * Traducción con IA (opcional). Solo se usa si ANTHROPIC_API_KEY está definida.
 * Devuelve { cypher, params, intent, explicacion } o lanza.
 */
async function traducirPorIA(texto, ctx = {}) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('IA no disponible (sin ANTHROPIC_API_KEY)');
    const axios = require('axios');

    const esquema = `Grafo Neo4j del museo:
Nodos: (:Comprador {usuario_id,nombre,email}), (:Obra {obra_id,nombre,genero,precio,estado}),
       (:Artista {artista_id,nombre,nacionalidad}), (:Genero {nombre})
Relaciones: (Comprador)-[:COMPRÓ]->(Obra), (Artista)-[:CREÓ]->(Obra),
            (Obra)-[:PERTENECE_A]->(Genero), (Artista)-[:TRABAJA_EN]->(Genero)
Géneros válidos: Pintura, Escultura, Orfebrería, Cerámica, Fotografía, Cristalería, Textil, Grabado, Acuarela.
estado de Obra: 'Disponible' | 'Reservada' | 'Vendida'.`;

    const sistema = `Eres un traductor de lenguaje natural a Cypher para Neo4j. Responde SOLO con un objeto JSON válido (sin texto extra) con las claves: cypher (string), params (objeto), explicacion (string). Reglas estrictas:
- La consulta debe ser de SOLO LECTURA (solo MATCH/OPTIONAL MATCH/WHERE/RETURN/ORDER BY/LIMIT). Nunca CREATE, MERGE, SET, DELETE, REMOVE, DROP.
- Usa parámetros $nombre en vez de literales cuando dependan de la pregunta.
- Si la pregunta menciona "yo/compré/mis", usa el parámetro $usuario_id.
- Limita resultados (LIMIT 10 por defecto).
${esquema}`;

    const usuario = ctx.usuario_id != null
        ? `Pregunta: "${texto}"\nContexto: usuario_id = ${ctx.usuario_id}`
        : `Pregunta: "${texto}"`;

    const { data } = await axios.post('https://api.anthropic.com/v1/messages', {
        model: process.env.NL2CYPHER_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: sistema,
        messages: [{ role: 'user', content: usuario }],
    }, {
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
        },
        timeout: 15000,
    });

    const texto_resp = (data.content || []).map(c => c.text || '').join('').trim();
    const json = JSON.parse(texto_resp.replace(/^```json\s*|\s*```$/g, ''));
    validarSoloLectura(json.cypher);
    // Inyecta usuario_id si la consulta lo usa y el modelo no lo puso.
    if (/\$usuario_id\b/.test(json.cypher) && ctx.usuario_id != null) {
        json.params = { usuario_id: Number(ctx.usuario_id), ...(json.params || {}) };
    }
    return { intent: 'ia', explicacion: json.explicacion || 'Consulta generada por IA.', cypher: json.cypher, params: json.params || {} };
}

/**
 * Traduce una pregunta a Cypher. Intenta IA si hay clave; si falla o no hay,
 * cae a reglas. Marca la fuente usada.
 * @returns {Promise<{cypher,params,intent,explicacion,fuente}|null>}
 */
async function traducir(texto, ctx = {}) {
    if (process.env.ANTHROPIC_API_KEY) {
        try {
            const r = await traducirPorIA(texto, ctx);
            return { ...r, fuente: 'ia' };
        } catch (e) {
            // cae a reglas
        }
    }
    const r = traducirPorReglas(texto, ctx);
    if (!r) return null;
    validarSoloLectura(r.cypher);
    return { ...r, fuente: 'reglas' };
}

module.exports = { traducir, traducirPorReglas, validarSoloLectura, normalizar };
