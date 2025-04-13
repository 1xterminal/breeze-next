const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('../routes/authRoutes');
const converterRoutes = require('../routes/converterRoutes');
const historyRoutes = require('../routes/historyRoutes');
const favouriteRoutes = require('../routes/favouriteRoutes');
const adminRoutes = require('../routes/adminRoutes');

const configureRoutes = (app) => {
    // Rate limiting for API routes
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again after 15 minutes'
    });
    app.use('/api/', limiter);

    // Mount routes
    app.use('/', require('../routes/index'));
    app.use('/api/auth', authRoutes);
    app.use('/converter', converterRoutes);
    app.use('/history', historyRoutes);
    app.use('/favorites', favouriteRoutes);
    app.use('/admin', adminRoutes);

    // 404 handler
    app.use((req, res, next) => {
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({ 
                success: false, 
                message: 'API endpoint not found' 
            });
        }
        res.status(404).render('pages/errors/404', { 
            title: 'Page Not Found',
            layout: 'layouts/main'
        });
    });
};

module.exports = configureRoutes; 