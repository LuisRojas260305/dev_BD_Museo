const router = require('express').Router();
const { getArtists, getArtistById } = require('../controllers/artist.controller');

router.get('/', getArtists);
router.get('/:id', getArtistById);

module.exports = router;
