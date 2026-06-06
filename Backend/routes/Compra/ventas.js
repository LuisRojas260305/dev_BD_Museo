/**
 * Routes for purchase/sale operations.
 *
 * Handles artwork reservations (members), sale confirmation and
 * cancellation (admin), listing of sales (admin), and invoice
 * retrieval (admin).
 *
 * @module routes/Compra/ventas
 */

const express = require('express');
const router = express.Router();
const ventaController = require('../../controllers/Compra/ventaController');
const { verificarToken, verificarMiembro, verificarAdmin } = require('../../shared/auth');

/**
 * POST /api/ventas/reservar
 * Reserve an artwork (member only).
 * @route POST /api/ventas/reservar
 * @auth Requires JWT + member role
 * @body {Object} req.body - Reservation details
 * @returns {Object} 201 - Reservation created
 */
router.post('/reservar', verificarToken, verificarMiembro, ventaController.reservarObra);

/**
 * PUT /api/ventas/:id/concretar
 * Confirm and complete a sale (admin only).
 * @route PUT /api/ventas/:id/concretar
 * @auth Requires JWT + admin role
 * @param {string} req.params.id - Sale ID
 * @body {Object} req.body - Sale completion details
 * @returns {Object} 200 - Sale confirmed
 */
router.put('/:id/concretar', verificarToken, verificarAdmin, ventaController.concretarVenta);

/**
 * PUT /api/ventas/:id/cancelar
 * Cancel a sale (admin only).
 * @route PUT /api/ventas/:id/cancelar
 * @auth Requires JWT + admin role
 * @param {string} req.params.id - Sale ID
 * @body {Object} req.body - Cancellation details
 * @returns {Object} 200 - Sale cancelled
 */
router.put('/:id/cancelar', verificarToken, verificarAdmin, ventaController.cancelarVenta);

/**
 * GET /api/ventas
 * List all sales (admin only).
 * @route GET /api/ventas
 * @auth Requires JWT + admin role
 * @query {Object} req.query - Filter and pagination parameters
 * @returns {Object} 200 - Sales list
 */
router.get('/', verificarToken, verificarAdmin, ventaController.getVentas);

/**
 * GET /api/ventas/facturas
 * List all invoices (admin only).
 * @route GET /api/ventas/facturas
 * @auth Requires JWT + admin role
 * @query {Object} req.query - Filter and pagination parameters
 * @returns {Object} 200 - Invoices list
 */
router.get('/facturas', verificarToken, verificarAdmin, ventaController.getFacturas);

/**
 * GET /api/ventas/facturas/:id
 * Get an invoice by ID (admin only).
 * @route GET /api/ventas/facturas/:id
 * @auth Requires JWT + admin role
 * @param {string} req.params.id - Invoice ID
 * @returns {Object} 200 - Invoice data
 */
router.get('/facturas/:id', verificarToken, verificarAdmin, ventaController.getFacturaById);

module.exports = router;
