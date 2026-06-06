/**
 * Routes for user management.
 *
 * Handles public user operations (registration, login, password recovery),
 * authenticated profile management (membership, security questions, password change),
 * and admin-only user CRUD.
 *
 * @module routes/Usuario/usuarios
 */

const express = require('express');
const router = express.Router();
const usuarioController = require('../../controllers/Usuario/usuarioController');
const { verificarToken, verificarAdmin } = require('../../shared/auth');

// ---------------------------------------------------------------------------
// Public routes (no authentication required)
// ---------------------------------------------------------------------------

/**
 * POST /api/usuarios/registro
 * Register a new user account.
 * @route POST /api/usuarios/registro
 * @body {Object} req.body - User registration data (name, email, password, etc.)
 * @returns {Object} 201 - User created
 */
router.post('/registro', usuarioController.registro);

/**
 * POST /api/usuarios/login
 * Authenticate and obtain a JWT token.
 * @route POST /api/usuarios/login
 * @body {Object} req.body - Login credentials (email, password)
 * @returns {Object} 200 - JWT token and user data
 */
router.post('/login', usuarioController.login);

/**
 * GET /api/usuarios/preguntas-de/:email
 * Retrieve the security questions associated with a user's email.
 * @route GET /api/usuarios/preguntas-de/:email
 * @param {string} req.params.email - User email
 * @returns {Object} 200 - Security questions list
 */
router.get('/preguntas-de/:email', usuarioController.obtenerPreguntasUsuario);

/**
 * POST /api/usuarios/recuperar-password-externo
 * Recover password externally (public).
 * @route POST /api/usuarios/recuperar-password-externo
 * @body {Object} req.body - Recovery details
 * @returns {Object} 200 - Recovery result
 */
router.post('/recuperar-password-externo', usuarioController.recuperarPasswordExterno);

// ---------------------------------------------------------------------------
// Authenticated routes (JWT required — user's own profile)
// ---------------------------------------------------------------------------

/**
 * GET /api/usuarios/perfil
 * Get the authenticated user's profile.
 * @route GET /api/usuarios/perfil
 * @auth Requires JWT
 * @returns {Object} 200 - User profile data
 */
router.get('/perfil', verificarToken, usuarioController.perfil);

/**
 * POST /api/usuarios/membresia
 * Pay for a membership (authenticated user).
 * @route POST /api/usuarios/membresia
 * @auth Requires JWT
 * @body {Object} req.body - Membership payment details
 * @returns {Object} 200 - Membership activated
 */
router.post('/membresia', verificarToken, usuarioController.pagarMembresia);

/**
 * POST /api/usuarios/seguridad
 * Save security question answers for the authenticated user.
 * @route POST /api/usuarios/seguridad
 * @auth Requires JWT
 * @body {Object} req.body - Security answers
 * @returns {Object} 200 - Answers saved
 */
router.post('/seguridad', verificarToken, usuarioController.guardarRespuestasSeguridad);

/**
 * GET /api/usuarios/mis-preguntas
 * Get the authenticated user's security questions.
 * @route GET /api/usuarios/mis-preguntas
 * @auth Requires JWT
 * @returns {Object} 200 - User's security questions
 */
router.get('/mis-preguntas', verificarToken, usuarioController.obtenerMisPreguntas);

/**
 * POST /api/usuarios/cambiar-pass-perfil
 * Change the authenticated user's password.
 * @route POST /api/usuarios/cambiar-pass-perfil
 * @auth Requires JWT
 * @body {Object} req.body - Current and new password
 * @returns {Object} 200 - Password changed
 */
router.post('/cambiar-pass-perfil', verificarToken, usuarioController.cambiarPasswordPerfil);

/**
 * POST /api/usuarios/regenerar-codigo
 * Regenerate the authenticated user's security code.
 * @route POST /api/usuarios/regenerar-codigo
 * @auth Requires JWT
 * @body {Object} req.body - Details for regeneration
 * @returns {Object} 200 - Code regenerated
 */
router.post('/regenerar-codigo', verificarToken, usuarioController.regenerarCodigoSeguridad);

/**
 * POST /api/usuarios/actualizar-preguntas
 * Update the authenticated user's security questions.
 * @route POST /api/usuarios/actualizar-preguntas
 * @auth Requires JWT
 * @body {Object} req.body - New security questions and answers
 * @returns {Object} 200 - Questions updated
 */
router.post('/actualizar-preguntas', verificarToken, usuarioController.actualizarPreguntasSeguridad);

// ---------------------------------------------------------------------------
// Admin routes (JWT + admin role required)
// ---------------------------------------------------------------------------

/**
 * GET /api/usuarios
 * List all users (admin only).
 * @route GET /api/usuarios
 * @auth Requires JWT + admin role
 * @query {Object} req.query - Filter and pagination parameters
 * @returns {Object} 200 - Users list
 */
router.get('/', verificarToken, verificarAdmin, usuarioController.getAllUsuarios);

/**
 * GET /api/usuarios/:id
 * Get a user by ID (admin only).
 * @route GET /api/usuarios/:id
 * @auth Requires JWT + admin role
 * @param {string} req.params.id - User ID
 * @returns {Object} 200 - User data
 */
router.get('/:id', verificarToken, verificarAdmin, usuarioController.getUsuarioById);

/**
 * POST /api/usuarios/admin
 * Register a new admin user (admin only).
 * @route POST /api/usuarios/admin
 * @auth Requires JWT + admin role
 * @body {Object} req.body - Admin user registration data
 * @returns {Object} 201 - Admin user created
 */
router.post('/admin', verificarToken, verificarAdmin, usuarioController.registroadmin);

/**
 * PUT /api/usuarios/:id
 * Update a user by ID (admin only).
 * @route PUT /api/usuarios/:id
 * @auth Requires JWT + admin role
 * @param {string} req.params.id - User ID
 * @body {Object} req.body - Updated user data
 * @returns {Object} 200 - User updated
 */
router.put('/:id', verificarToken, verificarAdmin, usuarioController.updateUsuario);

/**
 * DELETE /api/usuarios/:id
 * Delete a user by ID (admin only).
 * @route DELETE /api/usuarios/:id
 * @auth Requires JWT + admin role
 * @param {string} req.params.id - User ID
 * @returns {Object} 200 - User deleted
 */
router.delete('/:id', verificarToken, verificarAdmin, usuarioController.deleteUsuario);

module.exports = router;
