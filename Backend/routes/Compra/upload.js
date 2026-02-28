const express = require('express');
const router = express.Router();
const { uploadImage, upload } = require('../../controllers/Compra/uploadController');
const { verificarToken, verificarAdmin } = require('../../middlewares/auth');

router.post('/', verificarToken, verificarAdmin, upload.single('imagen'), uploadImage);

module.exports = router;