const express = require('express');
const router = express.Router();
const usuarioController = require('../../controllers/Usuario/usuarioController');
const { verificarToken } = require('../../middlewares/auth');

// Rutas básicas
router.post('/registro', usuarioController.registro);
router.post('/login', usuarioController.login);
router.get('/perfil', verificarToken, usuarioController.perfil);
router.post('/membresia', verificarToken, usuarioController.pagarMembresia);
router.post('/seguridad', verificarToken, usuarioController.guardarRespuestasSeguridad);

// NUEVAS RUTAS: Gestión de Perfil (Requieren Token)
router.get('/mis-preguntas', verificarToken, usuarioController.obtenerMisPreguntas);
router.post('/cambiar-pass-perfil', verificarToken, usuarioController.cambiarPasswordPerfil);
router.post('/regenerar-codigo', verificarToken, usuarioController.regenerarCodigoSeguridad);
router.post('/actualizar-preguntas', verificarToken, usuarioController.actualizarPreguntasSeguridad);

// NUEVAS RUTAS: Recuperación Externa (Públicas)
router.get('/preguntas-de/:email', usuarioController.obtenerPreguntasUsuario);
router.post('/recuperar-password-externo', usuarioController.recuperarPasswordExterno);

module.exports = router;