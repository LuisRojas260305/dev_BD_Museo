const axios = require('axios');

const CASSANDRA_URL = process.env.CASSANDRA_URL || 'http://localhost:3002/api/auditoria';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'museo_internal_key_2026';

const client = axios.create({
    baseURL: CASSANDRA_URL,
    timeout: 8000,
    headers: { 'x-internal-key': INTERNAL_KEY },
});

const getEventos = async (params = {}) => {
    const response = await client.get('/eventos', { params });
    return response.data;
};

const getReportes = async (params = {}) => {
    const response = await client.get('/reportes', { params });
    return response.data;
};

module.exports = { getEventos, getReportes };
