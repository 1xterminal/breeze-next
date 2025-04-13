const express = require('express');
const { isUser } = require('../middleware/roles');
const historyController = require('../controllers/historyController');

const router = express.Router();

// Get history page
router.get('/', isUser, historyController.getHistory);

// Clear all history
router.post('/clear', isUser, historyController.clearHistory);

// Delete specific search (using POST instead of DELETE)
router.post('/delete/:id', isUser, historyController.deleteSearch);

module.exports = router; 