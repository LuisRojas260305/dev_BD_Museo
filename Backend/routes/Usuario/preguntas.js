const express = require('express');
const router = express.Router();
const preguntaseguridadController = require('../../controllers/Usuario/preguntaseguridadController');

// GET /api/preguntas-seguridad
router.get('/', preguntaseguridadController.getAll);

module.exports = router;