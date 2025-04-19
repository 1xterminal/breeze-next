const express = require('express');
const { isUser } = require('../middleware/roles');
const {
    submitFeedback,
    getFeedbackHistory,
    getSubmitForm
} = require('../controllers/feedbackController');

const router = express.Router();

// Public routes
router.get('/submit', getSubmitForm);
router.post('/submit', submitFeedback);

// User routes
router.get('/history', isUser, getFeedbackHistory);

module.exports = router; 