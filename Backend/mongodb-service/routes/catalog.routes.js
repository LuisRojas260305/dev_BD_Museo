const router = require('express').Router();
const {
  getCatalog,
  getCatalogById,
  searchCatalog,
  createSslContext,
  healthCheck,
} = require('../controllers/catalog.controller');
const { validateCatalogQuery, validateSearchQuery } = require('../middleware/validation');
const { opcionalAuth } = require('../middleware/auth');

// Auth opcional en GET — permite acceso público pero identifica al usuario si hay sesión
router.get('/', opcionalAuth, validateCatalogQuery, getCatalog);
router.get('/search', opcionalAuth, validateSearchQuery, searchCatalog);
router.get('/health', healthCheck);
router.get('/ssl/contexto', createSslContext); // Inicializa contexto SSL (sin auth)
router.get('/:id', opcionalAuth, getCatalogById);

module.exports = router;
