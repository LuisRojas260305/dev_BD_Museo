// Catalog Proxy — gateway del monolito a mongodb-service
// Usa axios para redirigir requests y pasa x-internal-key para auth service-to-service.
const axios = require('axios');
const https = require('https');

const CATALOG_URL = process.env.CATALOG_URL || 'http://localhost:3001/api/catalog';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'museo_internal_key_2026';

// Axios instance con timeout y keep-alive
const client = axios.create({
    baseURL: CATALOG_URL,
    timeout: 8000,
    headers: {
        'x-internal-key': INTERNAL_KEY,
    },
    httpsAgent: new https.Agent({ keepAlive: true }),
});

const getCatalog = async (params = {}) => {
    const response = await client.get('/', { params });
    return response.data;
};

const getCatalogById = async (id, params = {}) => {
    const response = await client.get(`/${id}`, { params });
    return response.data;
};

const searchCatalog = async (params = {}) => {
    const response = await client.get('/search', { params });
    return response.data;
};

const createSslContext = async () => {
    const response = await client.get('/ssl/contexto');
    return response.data;
};

module.exports = { getCatalog, getCatalogById, searchCatalog, createSslContext };
