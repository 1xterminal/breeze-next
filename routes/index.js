const express = require('express');
const { checkAuth, guestsOnly, requireAuth, requireAdmin } = require('../middleware/auth');
const { isAdmin, isUser } = require('../middleware/roles');
const homeController = require('../controllers/homeController');
const dashboardRoutes = require('./dashboardRoutes');
const converterRoutes = require('./converterRoutes');

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

// Mount dashboard routes
router.use('/dashboard', dashboardRoutes);
router.use('/converter', converterRoutes);

// Other user routes
router.get('/favorites', isUser, (req, res) => {
  res.render('pages/dashboard/favorites', { 
    title: 'Favorites', 
    user: req.user 
  });
});

router.get('/history', isUser, (req, res) => {
  res.render('pages/dashboard/history', { 
    title: 'Search History', 
    user: req.user 
  });
});

router.get('/converter', isUser, (req, res) => {
  res.render('pages/dashboard/converter', { 
    title: 'Temperature Converter', 
    user: req.user 
  });
});

router.get('/profile', isUser, (req, res) => {
  res.render('pages/profile/index', { 
    title: 'Profile', 
    user: req.user 
  });
});

// Admin routes - require admin role
router.get('/admin', isAdmin, (req, res) => {
  res.render('pages/admin/index', { 
    title: 'Admin Dashboard', 
    user: req.user 
  });
});

router.get('/logout', (req, res) => {
    // Clear session
    req.session.destroy();
    // Clear JWT cookie if exists
    res.clearCookie('token');
    // Redirect to login
    res.redirect('/login');
});

module.exports = router;
