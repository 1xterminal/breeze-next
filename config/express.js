const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const { checkAuth } = require('../middleware/auth');

const configureExpress = (app) => {
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
    app.set('views', path.join(__dirname, '../views'));
    app.use(expressLayouts);
    app.set('layout', 'layouts/main');

    // Layout configuration
    app.use((req, res, next) => {
        const noLayoutPaths = ['/login', '/register'];
        if (noLayoutPaths.includes(req.path)) {
            res.locals.layout = false;
        }
        next();
    });

    // Static files
    app.use(express.static(path.join(__dirname, '../public')));
    app.use('/assets', express.static(path.join(__dirname, '../public/assets')));
};

module.exports = configureExpress; 