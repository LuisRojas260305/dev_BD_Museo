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
const { getArtists, getArtistById } = require('../controllers/artist.controller');
const { validateCatalogQuery, validateSearchQuery } = require('../middleware/validation');
const { opcionalAuth, verificarToken, verificarAdmin } = require('../middleware/auth');

// Auth opcional en GET — permite acceso público pero identifica al usuario si hay sesión
router.get('/', opcionalAuth, validateCatalogQuery, getCatalog);
router.get('/search', opcionalAuth, validateSearchQuery, searchCatalog);
router.get('/health', healthCheck);
router.get('/ssl/contexto', createSslContext); // Inicializa contexto SSL (sin auth)

// Artistas — antes de :id para evitar que "artistas" sea capturado como parámetro
router.get('/artists', opcionalAuth, getArtists);
router.get('/artists/:id', opcionalAuth, getArtistById);

// CRUD de obras (admin) — requieren autenticación plena
// El proxy (monolito) envía x-internal-key + ya validó JWT y admin
router.post('/', verificarToken, verificarAdmin, createObra);
router.put('/:id', verificarToken, verificarAdmin, updateObra);
router.delete('/:id', verificarToken, verificarAdmin, deleteObra);

router.get('/:id', opcionalAuth, getCatalogById);

module.exports = router;
