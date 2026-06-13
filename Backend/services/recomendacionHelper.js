/**
 * Helper de recomendaciones que comunica el core (SQL) con el microservicio
 * neo4j-service. Registra la compra en el grafo de forma asíncrona ("fire and
 * forget"): los fallos se silencian para no interrumpir la venta (consistencia
 * eventual — el core prioriza la transacción ACID, Neo4j se sincroniza después).
 */
const axios = require('axios');

const NEO4J_URL = process.env.NEO4J_URL || 'http://localhost:3003/api/recomendaciones';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'museo_internal_key_2026';

/**
 * Registra una compra concretada en el grafo Neo4j.
 * @param {Object} datos - { usuario_id, comprador_nombre, comprador_email, obra_id, obra_nombre, genero, precio, venta_id, fecha }
 * @returns {Promise<void>}
 */
async function registrarCompra(datos) {
    try {
        await axios.post(`${NEO4J_URL}/compras`, datos, {
            timeout: 4000,
            headers: { 'x-internal-key': INTERNAL_KEY },
        });
    } catch (err) {
        console.error(`Recomendaciones (Neo4j) no disponible (compra venta ${datos.venta_id}):`, err.message);
    }
}

/**
 * Obtiene recomendaciones para un usuario desde el grafo.
 * @param {number} usuarioId
 * @param {Object} [opts] - { estrategia, limite }
 * @returns {Promise<Object>} Respuesta del servicio
 */
async function obtenerRecomendaciones(usuarioId, opts = {}) {
    const { estrategia = 'variado', limite = 12 } = opts;
    const { data } = await axios.get(`${NEO4J_URL}/${usuarioId}`, {
        params: { estrategia, limite },
        timeout: 5000,
        headers: { 'x-internal-key': INTERNAL_KEY },
    });
    return data;
}

/**
 * Traduce una pregunta en lenguaje natural a Cypher y la ejecuta (Reto +5%).
 * @param {string} pregunta
 * @param {number} [usuario_id]
 * @returns {Promise<Object>} { cypher, params, intent, resultados, ... }
 */
async function preguntarLenguajeNatural(pregunta, usuario_id) {
    const { data } = await axios.post(`${NEO4J_URL}/nl`, { pregunta, usuario_id }, {
        timeout: 20000,
        headers: { 'x-internal-key': INTERNAL_KEY },
    });
    return data;
}

module.exports = { registrarCompra, obtenerRecomendaciones, preguntarLenguajeNatural };
