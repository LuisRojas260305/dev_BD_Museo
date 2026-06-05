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

// Artistas — proxy a mongodb-service
const getArtists = async (params = {}) => {
    const response = await client.get('/artists', { params });
    return response.data;
};

const getArtistById = async (id, params = {}) => {
    const response = await client.get(`/artists/${id}`, { params });
    return response.data;
};

// ---------------------------------------------------------------------------
// CRUD de Obras (admin)
// ---------------------------------------------------------------------------

const createObra = async (obraData) => {
    const response = await client.post('/', obraData);
    return response.data;
};

const updateObra = async (id, obraData) => {
    const response = await client.put(`/${id}`, obraData);
    return response.data;
};

const deleteObra = async (id) => {
    const response = await client.delete(`/${id}`);
    return response.data;
};

// ---------------------------------------------------------------------------
// CRUD de Artistas (admin)
// ---------------------------------------------------------------------------

const createArtist = async (artistData) => {
    const response = await client.post('/artists', artistData);
    return response.data;
};

const updateArtist = async (id, artistData) => {
    const response = await client.put(`/artists/${id}`, artistData);
    return response.data;
};

const deleteArtist = async (id) => {
    const response = await client.delete(`/artists/${id}`);
    return response.data;
};

module.exports = { getCatalog, getCatalogById, searchCatalog, createSslContext, getArtists, getArtistById, createObra, updateObra, deleteObra, createArtist, updateArtist, deleteArtist };
