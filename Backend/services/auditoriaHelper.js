/**
 * Helper de auditoría que envía eventos al microservicio cassandra-service.
 * Los fallos de conexión se silencian para no interrumpir el flujo principal.
 */
const axios = require('axios');

const CASSANDRA_URL = process.env.CASSANDRA_URL || 'http://localhost:3002/api/auditoria';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'museo_internal_key_2026';

/**
 * Registra un evento de auditoría en el sistema.
 * @param {string} tipo_evento - Tipo de evento (ej: 'error_sistema', 'login')
 * @param {string} usuario - Identificador del usuario que generó el evento
 * @param {string} severidad - Nivel de severidad ('info', 'warning', 'critical')
 * @param {Object} [metadata={}] - Datos adicionales del evento
 * @returns {Promise<void>}
 */
async function auditar(tipo_evento, usuario, severidad, metadata = {}) {
    try {
        await axios.post(`${CASSANDRA_URL}/eventos`, {
            tipo_evento, usuario, severidad, metadata
        }, {
            timeout: 4000,
            headers: { 'x-internal-key': INTERNAL_KEY }
        });
    } catch (err) {
        console.error(`Auditoría no disponible (${tipo_evento}):`, err.message);
    }
}

module.exports = { auditar };
