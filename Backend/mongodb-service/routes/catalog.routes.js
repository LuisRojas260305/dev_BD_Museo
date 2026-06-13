/**
 * Catalog route definitions - maps URL paths to controller functions.
 * Public endpoints use opcionalAuth (identifies user if session exists, allows anonymous access).
 * Admin CRUD endpoints require verified JWT token + admin role via verificarToken + verificarAdmin.
 */
const router = require('express').Router();
const {
  getCatalog,
  getCatalogById,
  searchCatalog,
  createSslContext,
  healthCheck,
  createObra,
  updateObra,
  deleteObra,
} = require('../controllers/catalog.controller');
const { getArtists, getArtistById, createArtist, updateArtist, deleteArtist } = require('../controllers/artist.controller');
const { getGeneros, getGeneroById, createGenero, updateGenero, deleteGenero } = require('../controllers/genero.controller');
const { validateCatalogQuery, validateSearchQuery } = require('../middleware/validation');
const { opcionalAuth, verificarToken, verificarAdmin } = require('../middleware/auth');

// Auth opcional en GET - permite acceso público pero identifica al usuario si hay sesión
router.get('/', opcionalAuth, validateCatalogQuery, getCatalog);
router.get('/search', opcionalAuth, validateSearchQuery, searchCatalog);
router.get('/health', healthCheck);
router.get('/ssl/contexto', createSslContext); // Inicializa contexto SSL (sin auth)

// Artistas - antes de :id para evitar que "artistas" sea capturado como parámetro
router.get('/artists', opcionalAuth, getArtists);
router.get('/artists/:id', opcionalAuth, getArtistById);
router.post('/artists', verificarToken, verificarAdmin, createArtist);
router.put('/artists/:id', verificarToken, verificarAdmin, updateArtist);
router.delete('/artists/:id', verificarToken, verificarAdmin, deleteArtist);

// Géneros - antes de :id para evitar que "generos" sea capturado como parámetro
router.get('/generos', opcionalAuth, getGeneros);
router.get('/generos/:id', opcionalAuth, getGeneroById);
router.post('/generos', verificarToken, verificarAdmin, createGenero);
router.put('/generos/:id', verificarToken, verificarAdmin, updateGenero);
router.delete('/generos/:id', verificarToken, verificarAdmin, deleteGenero);

// CRUD de obras (admin) - requieren autenticación plena
// El proxy (monolito) envía x-internal-key + ya validó JWT y admin
router.post('/', verificarToken, verificarAdmin, createObra);
router.put('/:id', verificarToken, verificarAdmin, updateObra);
router.delete('/:id', verificarToken, verificarAdmin, deleteObra);

router.get('/:id', opcionalAuth, getCatalogById);

module.exports = router;
