const express = require('express');
const { registerUser, loginUser, loginAdmin, registerUserForm } = require('../controllers/authController');
const { registerValidationRules, loginValidationRules } = require('../utils/validators'); // Import validators

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
    '/register',
    registerValidationRules(), // Apply validation rules
    registerUser
);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
    '/login',
    loginValidationRules(), // Apply validation rules
    loginUser
);

// @route   POST /api/auth/admin/login
// @desc    Authenticate admin & get token
// @access  Public
router.post(
    '/admin/login', // Changed path for clarity
    loginValidationRules(), // Apply same basic login rules
    loginAdmin
);

// Form-handling routes for browser-based auth
router.post('/web/register', registerValidationRules(), registerUserForm);
router.post('/web/login', loginValidationRules(), (req, res, next) => {
  // Set returnTo in session if there's a redirect query param
  if (req.query.redirect) {
    req.session.returnTo = req.query.redirect;
  }
  loginUser(req, res, next);
});

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
        
        // Flash message (optional)
        req.flash('success', 'Successfully logged out');
        
        // Redirect to login page
        res.redirect('/login');
    });
});

module.exports = router;
