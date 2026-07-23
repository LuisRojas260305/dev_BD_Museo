/**
 * Generación de descripciones de obras con IA (Groq, gratis).
 *
 * Usa la API de Groq (compatible con OpenAI) para redactar una breve descripción
 * de sala a partir de los datos de la obra: nombre, género, artista y época. No
 * mira la foto; la presencia de foto solo se usa como filtro en las rutas.
 *
 * Sigue el mismo patrón que Backend/neo4j-service/services/nlToCypher.js: si no
 * hay GROQ_API_KEY o la llamada falla, cae a una descripción por plantilla para
 * no romper el flujo.
 *
 * @module services/descripcionIA
 */
const axios = require('axios');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Devuelve el nombre completo del artista a partir de las distintas formas en
 * que puede venir la obra (campo plano artista_nombre o subdocumento artista).
 */
function nombreArtista(obra) {
    if (obra.artista_nombre) return String(obra.artista_nombre).trim();
    if (obra.artista && (obra.artista.nombre || obra.artista.apellido)) {
        return `${obra.artista.nombre || ''} ${obra.artista.apellido || ''}`.trim();
    }
    return '';
}

/** Nombre del género tolerante a las dos formas (genero_nombre o genero). */
function nombreGenero(obra) {
    return String(obra.genero_nombre || obra.genero || '').trim();
}

/** Nombre de la época si existe (subdocumento epoca.nombre). */
function nombreEpoca(obra) {
    if (obra.epoca && obra.epoca.nombre) return String(obra.epoca.nombre).trim();
    return '';
}

/**
 * Arma un texto compacto con los datos de la obra para pasarlo al modelo.
 * Incluye 1-2 rasgos de `detalles` (estilos/técnicas/materiales) si existen.
 */
function construirContexto(obra) {
    const partes = [];
    if (obra.nombre) partes.push(`Título: "${obra.nombre}"`);
    const g = nombreGenero(obra);
    if (g) partes.push(`Género: ${g}`);
    const a = nombreArtista(obra);
    if (a) partes.push(`Artista: ${a}`);
    const e = nombreEpoca(obra);
    if (e) partes.push(`Época: ${e}`);

    const d = obra.detalles || {};
    const rasgos = [];
    for (const clave of ['estilos', 'tematicas', 'tecnicas', 'materiales', 'soporte_nombre']) {
        const v = d[clave];
        if (v && v.toString().trim() !== '') {
            rasgos.push(Array.isArray(v) ? v.join(', ') : v);
        }
        if (rasgos.length >= 2) break;
    }
    if (rasgos.length) partes.push(`Rasgos: ${rasgos.join('; ')}`);

    return partes.join('\n');
}

/**
 * Descripción de respaldo por plantilla (sin IA). Se usa cuando no hay
 * GROQ_API_KEY o la llamada a Groq falla. Es escueta y factual.
 * @param {Object} obra
 * @returns {string}
 */
function descripcionPlantilla(obra) {
    const nombre = obra.nombre || 'Esta obra';
    const g = nombreGenero(obra);
    const a = nombreArtista(obra);
    const e = nombreEpoca(obra);

    let txt = `"${nombre}" es una obra`;
    if (g) txt += ` de ${g}`;
    if (a) txt += ` del artista ${a}`;
    if (e) txt += `, correspondiente a la época ${e}`;
    txt += '. Forma parte del catálogo del Museo de Arte Contemporáneo.';
    return txt;
}

const SISTEMA = `Eres un curador de un museo de arte contemporáneo. Escribe una descripción de sala para una obra, en español.
Reglas:
- 2 o 3 frases, alrededor de 60 palabras.
- Tono evocador pero sobrio, museístico.
- Basa el texto en el título, el género, el artista y la época que te den.
- No inventes fechas, biografías ni datos históricos concretos: describe la pieza de forma sugerente, no afirmes hechos que no puedas saber.
- No uses guiones largos.
- Devuelve solo el texto de la descripción, sin comillas, sin encabezados ni viñetas.`;

/**
 * Genera una descripción para la obra usando Groq. Si no hay clave o falla,
 * devuelve la descripción por plantilla.
 * @param {Object} obra - Documento de la obra (nombre, genero, artista, epoca, detalles...).
 * @returns {Promise<string>} Texto de la descripción.
 */
async function generarDescripcion(obra) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return descripcionPlantilla(obra);

    try {
        const { data } = await axios.post(GROQ_URL, {
            model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
            max_tokens: 300,
            temperature: 0.8,
            messages: [
                { role: 'system', content: SISTEMA },
                { role: 'user', content: construirContexto(obra) },
            ],
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'content-type': 'application/json',
            },
            timeout: 15000,
        });

        let texto = (((data.choices || [])[0] || {}).message || {}).content || '';
        texto = texto.trim().replace(/^["'“”]+|["'“”]+$/g, '').trim();
        if (!texto) return descripcionPlantilla(obra);
        return texto;
    } catch (e) {
        // Ante cualquier fallo (sin cuota, red, formato) cae a la plantilla.
        return descripcionPlantilla(obra);
    }
}

module.exports = { generarDescripcion, descripcionPlantilla, construirContexto };
