const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./utils/database');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const { checkAuth } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const converterRoutes = require('./routes/converterRoutes');
// const adminRoutes = require('./routes/adminRoutes');
// const userRoutes = require('./routes/userRoutes');

// Load environment variables
require('dotenv').config();

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB().then(() => {
    console.log('Database connected successfully');
}).catch(err => {
    console.error('Database connection failed:', err);
    process.exit(1);
});

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https:', '*'],
            scriptSrc: ["'self'", "'unsafe-inline'", 'https:'],
            imgSrc: ["'self'", 'data:', 'https:', '*'],
            connectSrc: ["'self'", 'https://api.open-meteo.com', 'https://nominatim.openstreetmap.org']
        }
    }
}));

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.ALLOWED_ORIGINS : '*',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration
app.use(session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    }
}));

// Flash messages
app.use(flash());

// Authentication middleware
app.use(checkAuth);

// Local variables middleware
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.messages = {
        success: req.flash('success'),
        error: req.flash('error'),
        info: req.flash('info')
    };
    // Set cache control headers
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');
// app.set('layout extractScripts', true); // what does this do? its forwhat?
// app.set('layout extractStyles', true);

// Add this to specify which routes should not use the layout
app.use((req, res, next) => {
  // List of paths that should not use the main layout
  const noLayoutPaths = ['/login', '/register'];
  
  if (noLayoutPaths.includes(req.path)) {
    res.locals.layout = false;
  }
  
  next();
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

// Add these console logs in your index.js
console.log('Static file path:', path.join(__dirname, 'public'));
console.log('Assets path:', path.join(__dirname, 'public/assets'));

// Mount routes
app.use('/', require('./routes/index'));
app.use('/api/auth', authRoutes);
app.use('/converter', converterRoutes)
// app.use('/admin', adminRoutes);
// app.use('/user', userRoutes);

// 404 handler
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ 
            success: false, 
            message: 'API endpoint not found' 
        });
    }
    res.status(404).render('pages/errors/404', { 
        title: 'Page Not Found' 
    });
});

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    // In production, you might want to exit and let your process manager restart the app
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // In production, you might want to exit and let your process manager restart the app
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
});
