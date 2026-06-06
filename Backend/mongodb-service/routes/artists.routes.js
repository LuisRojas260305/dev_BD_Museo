const router = require('express').Router();
const { verificarToken, verificarAdmin } = require('../middleware/auth');
const { getArtists, getArtistById, createArtist, updateArtist, deleteArtist } = require('../controllers/artist.controller');

router.get('/', getArtists);
router.get('/:id', getArtistById);

router.post('/', verificarToken, verificarAdmin, createArtist);
router.put('/:id', verificarToken, verificarAdmin, updateArtist);
router.delete('/:id', verificarToken, verificarAdmin, deleteArtist);

module.exports = router;
