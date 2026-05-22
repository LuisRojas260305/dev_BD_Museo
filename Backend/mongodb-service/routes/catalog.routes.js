const router = require('express').Router();
const {
  getCatalog,
  getCatalogById,
  searchCatalog,
  healthCheck,
} = require('../controllers/catalog.controller');
const { validateCatalogQuery, validateSearchQuery } = require('../middleware/validation');

router.get('/', validateCatalogQuery, getCatalog);
router.get('/search', validateSearchQuery, searchCatalog);
router.get('/health', healthCheck);
router.get('/:id', getCatalogById);

module.exports = router;
