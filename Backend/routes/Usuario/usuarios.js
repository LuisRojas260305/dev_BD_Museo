const express = require('express');
const router = express.Router();
const usuarioController = require('../../controllers/Usuario/usuarioController');
const { verificarToken } = require('../../middlewares/auth');

router.post('/registro', usuarioController.registro);
router.post('/login', usuarioController.login);
router.get('/perfil', verificarToken, usuarioController.perfil);
router.post('/membresia', verificarToken, usuarioController.pagarMembresia);
router.post('/recuperar-codigo', usuarioController.recuperarCodigo);

module.exports = router;