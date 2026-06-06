/**
 * Proxy HTTP hacia el microservicio mongodb-service para el catálogo de obras.
 * Usa axios para redirigir requests y pasa x-internal-key para autenticación
 * service-to-service.
 */
const axios = require('axios');
const https = require('https');

const CATALOG_URL = process.env.CATALOG_URL || 'http://localhost:3001/api/catalog';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'museo_internal_key_2026';

const client = axios.create({
    baseURL: CATALOG_URL,
    timeout: 8000,
    headers: {
        'x-internal-key': INTERNAL_KEY,
    },
    httpsAgent: new https.Agent({ keepAlive: true }),
});

/**
 * Obtiene el listado de obras del catálogo con filtros opcionales.
 * @param {Object} [params={}] - Parámetros de consulta (filtros, paginación)
 * @returns {Promise<Object>} Datos del catálogo
 */
const getCatalog = async (params = {}) => {
    const response = await client.get('/', { params });
    return response.data;
};

/**
 * Obtiene una obra del catálogo por su ID.
 * @param {string} id - ID de la obra
 * @param {Object} [params={}] - Parámetros adicionales de consulta
 * @returns {Promise<Object>} Datos de la obra
 */
const getCatalogById = async (id, params = {}) => {
    const response = await client.get(`/${id}`, { params });
    return response.data;
};

/**
 * Busca obras en el catálogo según los parámetros de búsqueda.
 * @param {Object} [params={}] - Parámetros de búsqueda (query, filtros)
 * @returns {Promise<Object>} Resultados de la búsqueda
 */
const searchCatalog = async (params = {}) => {
    const response = await client.get('/search', { params });
    return response.data;
};

/**
 * Obtiene el contexto SSL actual desde mongodb-service.
 * @returns {Promise<Object>} Contexto SSL
 */
const createSslContext = async () => {
    const response = await client.get('/ssl/contexto');
    return response.data;
};

// Artistas — proxy a mongodb-service

/**
 * Obtiene el listado de artistas con filtros opcionales.
 * @param {Object} [params={}] - Parámetros de consulta
 * @returns {Promise<Object>} Datos de artistas
 */
const getArtists = async (params = {}) => {
    const response = await client.get('/artists', { params });
    return response.data;
};

/**
 * Obtiene un artista por su ID.
 * @param {string} id - ID del artista
 * @param {Object} [params={}] - Parámetros adicionales de consulta
 * @returns {Promise<Object>} Datos del artista
 */
const getArtistById = async (id, params = {}) => {
    const response = await client.get(`/artists/${id}`, { params });
    return response.data;
};

// ---------------------------------------------------------------------------
// CRUD de Obras (admin)
// ---------------------------------------------------------------------------

/**
 * Crea una nueva obra en el catálogo.
 * @param {Object} obraData - Datos de la obra
 * @returns {Promise<Object>} Obra creada
 */
const createObra = async (obraData) => {
    const response = await client.post('/', obraData);
    return response.data;
};

/**
 * Actualiza una obra existente en el catálogo.
 * @param {string} id - ID de la obra
 * @param {Object} obraData - Datos actualizados de la obra
 * @returns {Promise<Object>} Obra actualizada
 */
const updateObra = async (id, obraData) => {
    const response = await client.put(`/${id}`, obraData);
    return response.data;
};

/**
 * Elimina una obra del catálogo.
 * @param {string} id - ID de la obra
 * @returns {Promise<Object>} Resultado de la operación
 */
const deleteObra = async (id) => {
    const response = await client.delete(`/${id}`);
    return response.data;
};

// ---------------------------------------------------------------------------
// CRUD de Géneros (admin)
// ---------------------------------------------------------------------------

/**
 * Obtiene el listado de géneros.
 * @param {Object} [params={}] - Parámetros de consulta
 * @returns {Promise<Object>} Datos de géneros
 */
const getGeneros = async (params = {}) => {
  const response = await client.get('/generos', { params });
  return response.data;
};

/**
 * Obtiene un género por su ID.
 * @param {string} id - ID del género
 * @returns {Promise<Object>} Datos del género
 */
const getGeneroById = async (id) => {
  const response = await client.get(`/generos/${id}`);
  return response.data;
};

/**
 * Crea un nuevo género.
 * @param {Object} data - Datos del género
 * @returns {Promise<Object>} Género creado
 */
const createGenero = async (data) => {
  const response = await client.post('/generos', data);
  return response.data;
};

/**
 * Actualiza un género existente.
 * @param {string} id - ID del género
 * @param {Object} data - Datos actualizados
 * @returns {Promise<Object>} Género actualizado
 */
const updateGenero = async (id, data) => {
  const response = await client.put(`/generos/${id}`, data);
  return response.data;
};

/**
 * Elimina un género.
 * @param {string} id - ID del género
 * @returns {Promise<Object>} Resultado de la operación
 */
const deleteGenero = async (id) => {
  const response = await client.delete(`/generos/${id}`);
  return response.data;
};

// ---------------------------------------------------------------------------
// CRUD de Artistas (admin)
// ---------------------------------------------------------------------------

/**
 * Crea un nuevo artista.
 * @param {Object} artistData - Datos del artista
 * @returns {Promise<Object>} Artista creado
 */
const createArtist = async (artistData) => {
    const response = await client.post('/artists', artistData);
    return response.data;
};

/**
 * Actualiza un artista existente.
 * @param {string} id - ID del artista
 * @param {Object} artistData - Datos actualizados del artista
 * @returns {Promise<Object>} Artista actualizado
 */
const updateArtist = async (id, artistData) => {
    const response = await client.put(`/artists/${id}`, artistData);
    return response.data;
};

/**
 * Elimina un artista.
 * @param {string} id - ID del artista
 * @returns {Promise<Object>} Resultado de la operación
 */
const deleteArtist = async (id) => {
    const response = await client.delete(`/artists/${id}`);
    return response.data;
};

module.exports = { getCatalog, getCatalogById, searchCatalog, createSslContext, getArtists, getArtistById, createObra, updateObra, deleteObra, createArtist, updateArtist, deleteArtist, getGeneros, getGeneroById, createGenero, updateGenero, deleteGenero };
