const express = require('express');
const { isAdmin } = require('../middleware/roles');
const {
    getDashboard,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    getLogs,
    getSettings,
    clearCache,
    clearOldLogs
} = require('../controllers/adminController');

const router = express.Router();

// All routes require admin role
router.use(isAdmin);

// Dashboard
router.get('/', getDashboard);

// User management
router.get('/users/:id', getUser);
router.post('/users', createUser);
router.post('/users/:id/update', updateUser);
router.post('/users/:id/delete', deleteUser);

// System logs
router.get('/logs', getLogs);

// System settings
router.get('/settings', getSettings);
router.post('/settings/clear-cache', clearCache);
router.post('/settings/clear-logs', clearOldLogs);

module.exports = router;



