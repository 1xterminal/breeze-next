const express = require('express');
const { isUser } = require('../middleware/roles');
const favouriteController = require('../controllers/favouriteController');

const router = express.Router();

// Get favorites page
router.get('/', isUser, favouriteController.getFavorites);

// Add to favorites
router.post('/add', isUser, favouriteController.addFavorite);

// Remove from favorites
router.post('/remove', isUser, favouriteController.removeFavorite);

module.exports = router; 