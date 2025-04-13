// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  // Log error
  console.error('Error:', err.message);
  console.error(err.stack);

  // Set cache headers to prevent caching error pages
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // API error response
  if (req.xhr || req.path.startsWith('/api/')) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      message: err.message || 'Internal Server Error',
      status: 'error'
    });
  }
  
  // Web error response
  const statusCode = err.statusCode || 500;
  if (statusCode === 404) {
    return res.status(404).render('pages/errors/404', { 
      title: 'Page Not Found' 
    });
  } else if (statusCode === 403) {
    return res.status(403).render('pages/errors/403', { 
      title: 'Access Denied' 
    });
  } else {
    return res.status(500).render('pages/errors/500', { 
      title: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? err : {} 
    });
  }
};

module.exports = errorHandler;
