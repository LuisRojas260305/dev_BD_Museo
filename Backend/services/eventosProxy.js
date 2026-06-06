/**
 * Proxy HTTP hacia el microservicio cassandra-service para eventos y reportes.
 * Redirige requests autenticados con x-internal-key para comunicación service-to-service.
 */
const axios = require('axios');

const CASSANDRA_URL = process.env.CASSANDRA_URL || 'http://localhost:3002/api/auditoria';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'museo_internal_key_2026';

const client = axios.create({
    baseURL: CASSANDRA_URL,
    timeout: 8000,
    headers: { 'x-internal-key': INTERNAL_KEY },
});

/**
 * Obtiene el listado de eventos con filtros opcionales.
 * @param {Object} [params={}] - Parámetros de consulta
 * @returns {Promise<Object>} Datos de eventos
 */
const getEventos = async (params = {}) => {
    const response = await client.get('/eventos', { params });
    return response.data;
};

/**
 * Obtiene reportes del sistema con filtros opcionales.
 * @param {Object} [params={}] - Parámetros de consulta
 * @returns {Promise<Object>} Datos de reportes
 */
const getReportes = async (params = {}) => {
    const response = await client.get('/reportes', { params });
    return response.data;
};

module.exports = { getEventos, getReportes };
