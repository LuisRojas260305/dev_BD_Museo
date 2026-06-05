const router = require('express').Router();
const {
  getCatalog,
  getCatalogById,
  searchCatalog,
  healthCheck,
} = require('../controllers/catalog.controller');
const { validateCatalogQuery, validateSearchQuery } = require('../middleware/validation');
const { opcionalAuth } = require('../middleware/authMiddleware');

// Auth opcional en GET — permite acceso público pero identifica al usuario si hay sesión
router.get('/', opcionalAuth, validateCatalogQuery, getCatalog);
router.get('/search', opcionalAuth, validateSearchQuery, searchCatalog);
router.get('/health', healthCheck);
router.get('/:id', opcionalAuth, getCatalogById);

module.exports = router;
