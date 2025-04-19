const express = require('express');
const { isUser } = require('../middleware/roles');
const {
    addFavorite,
    removeFavorite,
    updateFavorite,
    getFavorites
} = require('../controllers/favouriteController');

const router = express.Router();

// All routes require user authentication
router.use(isUser);

// Get favorites page
router.get('/', getFavorites);

// Add favorite
router.post('/add', addFavorite);

// Remove favorite
router.post('/remove', removeFavorite);

// Update favorite
router.post('/:favoriteId/update', updateFavorite);

module.exports = router; 