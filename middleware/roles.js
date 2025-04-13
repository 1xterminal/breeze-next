// Middleware to check if user has admin role
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).redirect('/login');
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).render('errors/403', { 
      message: 'Access denied. Admin privileges required.' 
    });
  }
  
  next();
};

// Middleware to check if user is a regular user or admin
const isUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).redirect('/login');
  }
  
  next();
};

module.exports = {
  isAdmin,
  isUser
};
