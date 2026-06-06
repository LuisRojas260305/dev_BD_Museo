/**
 * Route for image upload operations.
 *
 * Handles admin-only image uploads via multer, delegating
 * processing to the upload controller.
 *
 * @module routes/Compra/upload
 */

const express = require('express');
const router = express.Router();
const { uploadImage, upload } = require('../../controllers/Compra/uploadController');
const { verificarToken, verificarAdmin } = require('../../shared/auth');

/**
 * POST /api/upload
 * Upload an image (admin only).
 * @route POST /api/upload
 * @auth Requires JWT + admin role
 * @body {File} req.file - Image file uploaded via multer (field: 'imagen')
 * @returns {Object} 200 - Upload result with image URL
 */
router.post('/', verificarToken, verificarAdmin, upload.single('imagen'), uploadImage);

module.exports = router;
