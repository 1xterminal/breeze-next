const express = require('express');
const { checkAuth, guestsOnly, requireAuth, requireAdmin } = require('../middleware/auth');
const { isAdmin, isUser } = require('../middleware/roles');
const homeController = require('../controllers/homeController');
const dashboardRoutes = require('./dashboardRoutes');
const converterRoutes = require('./converterRoutes');
const historyRoutes = require('./historyRoutes');
const { getFavorites } = require('../controllers/favouriteController');
const { getProfile, updateSettings, changePassword } = require('../controllers/profileController');
const { getDashboard } = require('../controllers/adminController');
const feedbackRoutes = require('./feedbackRoutes');

const router = express.Router();

// Public routes
router.get('/', homeController.index);
router.get('/weather', homeController.getWeather);
router.get('/api/weather', homeController.apiGetWeather);

// Auth routes - redirect if already logged in
router.get('/login', guestsOnly, (req, res) => {
  res.render('pages/auth/login', { 
    title: 'Login', 
    user: null,
    layout: false
  });
});

router.get('/register', guestsOnly, (req, res) => {
  res.render('pages/auth/register', { 
    title: 'Register', 
    user: null 
  });
});

// Mount feature routes
router.use('/dashboard', dashboardRoutes);
router.use('/converter', converterRoutes);
router.use('/history', historyRoutes);

// User routes
router.get('/favorites', isUser, getFavorites);

// Profile routes
router.get('/profile', isUser, getProfile);
router.post('/profile/settings', isUser, updateSettings);
router.post('/profile/change-password', isUser, changePassword);

// Admin routes
router.get('/admin', isAdmin, getDashboard);

// Feedback routes
router.get('/feedback/submit', (req, res) => {
  res.render('pages/feedback/submit', {
    title: 'Submit Feedback',
    user: req.user,
    layout: 'layouts/main'
  });
});
router.use('/feedback', feedbackRoutes);
router.use('/admin/feedback', isAdmin, feedbackRoutes);

// Logout route - handle both GET and POST
router.post('/logout', (req, res) => {
    // Clear session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        // Clear JWT cookie
        res.clearCookie('token');
        // Clear any other auth-related cookies
        res.clearCookie('connect.sid');
        
        // Redirect to login
        res.redirect('/login');
    });
});

// Keep GET route for direct URL access
router.get('/logout', (req, res) => {
    // Clear session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        // Clear JWT cookie
        res.clearCookie('token');
        // Clear any other auth-related cookies
        res.clearCookie('connect.sid');
        
        // Redirect to login
        res.redirect('/login');
    });
});

module.exports = router;
