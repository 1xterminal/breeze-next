const express = require('express');
const { isUser, isAdmin } = require('../middleware/roles');
const {
    submitFeedback,
    getFeedbackHistory,
    getSubmitForm
} = require('../controllers/feedbackController');

const router = express.Router();

// Public routes
router.get('/submit', isUser, getSubmitForm);
router.post('/submit', isUser, submitFeedback);

// Admin routes
router.get('/history', isAdmin, getFeedbackHistory);

module.exports = router; 