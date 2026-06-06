/**
 * Routes for sales and membership reports.
 *
 * Provides admin-only endpoints for querying sales by period,
 * billing summaries, and membership statistics.
 *
 * @module routes/Compra/reportes
 */

const express = require('express');
const router = express.Router();
const reportesController = require('../../controllers/Compra/reportesController');
const { verificarToken, verificarAdmin } = require('../../shared/auth');

/**
 * GET /api/reportes/ventas
 * Get artworks sold within a date period (admin only).
 * @route GET /api/reportes/ventas
 * @auth Requires JWT + admin role
 * @query {Object} req.query - Period filters (start date, end date, etc.)
 * @returns {Object} 200 - Sold artworks report
 */
router.get('/ventas', verificarToken, verificarAdmin, reportesController.obrasVendidasPorPeriodo);

/**
 * GET /api/reportes/facturacion
 * Get billing summary (admin only).
 * @route GET /api/reportes/facturacion
 * @auth Requires JWT + admin role
 * @query {Object} req.query - Period filters
 * @returns {Object} 200 - Billing summary
 */
router.get('/facturacion', verificarToken, verificarAdmin, reportesController.resumenFacturacion);

/**
 * GET /api/reportes/membresias
 * Get membership summary (admin only).
 * @route GET /api/reportes/membresias
 * @auth Requires JWT + admin role
 * @query {Object} req.query - Filters
 * @returns {Object} 200 - Membership summary
 */
router.get('/membresias', verificarToken, verificarAdmin, reportesController.resumenMembresias);

module.exports = router;
