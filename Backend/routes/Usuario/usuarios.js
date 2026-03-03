const express = require('express');
const router = express.Router();
const usuarioController = require('../../controllers/Usuario/usuarioController');
const { verificarToken, verificarAdmin } = require('../../middlewares/auth');

// Rutas públicas
router.post('/registro', usuarioController.registro);
router.post('/login', usuarioController.login);
router.get('/preguntas-de/:email', usuarioController.obtenerPreguntasUsuario);
router.post('/recuperar-password-externo', usuarioController.recuperarPasswordExterno);

// Rutas que requieren token (perfil propio)
router.get('/perfil', verificarToken, usuarioController.perfil);
router.post('/membresia', verificarToken, usuarioController.pagarMembresia);
router.post('/seguridad', verificarToken, usuarioController.guardarRespuestasSeguridad);
router.get('/mis-preguntas', verificarToken, usuarioController.obtenerMisPreguntas);
router.post('/cambiar-pass-perfil', verificarToken, usuarioController.cambiarPasswordPerfil);
router.post('/regenerar-codigo', verificarToken, usuarioController.regenerarCodigoSeguridad);
router.post('/actualizar-preguntas', verificarToken, usuarioController.actualizarPreguntasSeguridad);

// Rutas de administración (solo admin)
router.get('/', verificarToken, verificarAdmin, usuarioController.getAllUsuarios);
router.get('/:id', verificarToken, verificarAdmin, usuarioController.getUsuarioById);
router.post('/admin', verificarToken, verificarAdmin, usuarioController.registroadmin); // ya existía
router.put('/:id', verificarToken, verificarAdmin, usuarioController.updateUsuario);
router.delete('/:id', verificarToken, verificarAdmin, usuarioController.deleteUsuario);

module.exports = router;