/**
 * Route for security questions lookup.
 *
 * Provides a public endpoint to retrieve the list of available
 * security questions for password recovery flows.
 *
 * @module routes/Usuario/preguntas
 */

const express = require('express');
const router = express.Router();
const preguntaseguridadController = require('../../controllers/Usuario/preguntaseguridadController');

/**
 * GET /api/preguntas-seguridad
 * Get all available security questions.
 * @route GET /api/preguntas-seguridad
 * @returns {Object} 200 - List of security questions
 */
router.get('/', preguntaseguridadController.getAll);

module.exports = router;
