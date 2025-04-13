const express = require('express');
const { isUser } = require('../middleware/roles');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

// Get dashboard page
router.get('/', isUser, dashboardController.getDashboard);

// Search for weather 
router.get('/search', isUser, dashboardController.searchWeather);

module.exports = router;
