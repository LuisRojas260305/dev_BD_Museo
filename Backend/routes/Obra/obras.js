const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});
const obraController = require('../../controllers/Obra/obraController');
const sslMiddleware = require('../../shared/sslMiddleware');

// SSL middleware para tracking de contexto de navegación
router.use(sslMiddleware);

router.get('/', obraController.getAllObras);
router.get('/:id', obraController.getObraById);
router.get('/:id/foto', obraController.getObraFoto);
router.post('/', upload.single('foto'), obraController.createObra);
router.put('/:id', upload.single('foto'), obraController.updateObra);
router.delete('/:id', obraController.deleteObra);

module.exports = router;