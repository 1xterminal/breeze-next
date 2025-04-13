const { jwtVerify } = require('jose');
const { TextEncoder } = require('util');
const User = require('../models/User');

// Universal middleware to check authentication status
// Will not block access, just sets req.isAuthenticated and user info
const checkAuth = async (req, res, next) => {
  try {
    // Set no-cache headers for all responses
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    // Already set in session
    if (req.session.user) {
      // Verify user still exists
      const user = await User.findById(req.session.user.id);
      if (!user) {
        req.session.destroy();
        res.clearCookie('token');
        req.isAuthenticated = false;
        return next();
      }
      
      req.isAuthenticated = true;
      req.user = req.session.user;
      return next();
    }
    
    // Check for token in cookies
    const token = req.cookies.token;
    if (!token) {
      req.isAuthenticated = false;
      return next();
    }

    try {
      // Verify token
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      
      // Verify user exists
      const user = await User.findById(payload.id);
      if (!user) {
        req.isAuthenticated = false;
        res.clearCookie('token');
        return next();
      }
      
      // Set user info 
      req.isAuthenticated = true;
      req.user = {
        id: user._id,
        username: user.username,
        role: user.role
      };
      
      // Store in session
      req.session.user = req.user;
      
    } catch (error) {
      // Invalid token
      req.isAuthenticated = false;
      res.clearCookie('token');
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to restrict routes to authenticated users only
const requireAuth = (req, res, next) => {
  // First run checkAuth to ensure authentication status is up to date
  checkAuth(req, res, () => {
    if (!req.isAuthenticated) {
      if (req.xhr || req.path.startsWith('/api/')) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      return res.redirect('/login');
    }
    next();
  });
};

// Middleware to restrict routes to admins only
const requireAdmin = (req, res, next) => {
  // First run checkAuth to ensure authentication status is up to date
  checkAuth(req, res, () => {
    if (!req.isAuthenticated || req.user.role !== 'admin') {
      if (req.xhr || req.path.startsWith('/api/')) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      return res.status(403).render('pages/errors/403', { title: 'Access Denied' });
    }
    next();
  });
};

// Middleware to prevent authenticated users from accessing certain routes (login, register)
const guestsOnly = (req, res, next) => {
  // First run checkAuth to ensure authentication status is up to date
  checkAuth(req, res, () => {
    if (req.isAuthenticated) {
      return res.redirect('/');
    }
    next();
  });
};

module.exports = {
  checkAuth,
  requireAuth,
  requireAdmin,
  guestsOnly
};
