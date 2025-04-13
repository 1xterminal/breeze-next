const express = require('express');
const { isUser } = require('../middleware/roles');
const converterController = require('../controllers/converterController');

const router = express.Router();

// Get dashboard page
router.get('/', isUser, converterController.getConverter);

module.exports = router;