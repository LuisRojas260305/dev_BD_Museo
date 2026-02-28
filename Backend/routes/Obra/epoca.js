const express = require('express');
const router = express.Router();
const epocaController = require('../../controllers/Obra/epocaController');

router.get('/', epocaController.getAll);
router.post('/', epocaController.create);
router.put('/:id', epocaController.update);
router.delete('/:id', epocaController.delete);

module.exports = router;