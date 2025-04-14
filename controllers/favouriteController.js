const User = require('../models/User');

/**
 * Add a location to favorites
 * @route POST /favorites/add
 * @access Private
 */
const addFavorite = async (req, res) => {
    try {
        console.log('Add Favorite - Request Body:', req.body);
        
        const { name } = req.body;
        const latitude = parseFloat(req.body.latitude);
        const longitude = parseFloat(req.body.longitude);

        // Enhanced validation
        if (!name || !req.body.latitude || !req.body.longitude || isNaN(latitude) || isNaN(longitude)) {
            console.log('Validation Failed:', {
                hasName: !!name,
                hasLatitude: !!req.body.latitude,
                hasLongitude: !!req.body.longitude,
                parsedLatitude: latitude,
                parsedLongitude: longitude
            });
            req.flash('error', 'Invalid location data. Please try again.');
            return res.redirect('/dashboard');
        }

        const user = await User.findById(req.user.id);
        console.log('Current User Favorites:', user.favorites);
        
        // Check if location already exists in favorites
        const exists = user.favorites.some(fav => 
            Math.abs(fav.latitude - latitude) < 0.0001 && 
            Math.abs(fav.longitude - longitude) < 0.0001
        );

        if (exists) {
            console.log('Location already exists in favorites');
            req.flash('info', 'Location already in favorites');
            return res.redirect('/dashboard');
        }

        // Add to favorites
        const newFavorite = {
            name,
            latitude,
            longitude,
            createdAt: new Date()
        };
        console.log('Adding New Favorite:', newFavorite);

        user.favorites.push(newFavorite);
        await user.save();
        
        console.log('Favorite added successfully');
        req.flash('success', 'Location added to favorites');
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Add favorite error:', error);
        console.error('Error stack:', error.stack);
        req.flash('error', 'Error adding location to favorites');
        res.redirect('/dashboard');
    }
};

/**
 * Remove a location from favorites
 * @route POST /favorites/remove
 * @access Private
 */
const removeFavorite = async (req, res) => {
    try {
        const { favoriteId } = req.body;

        await User.findByIdAndUpdate(
            req.user.id,
            { $pull: { favorites: { _id: favoriteId } } }
        );

        req.flash('success', 'Location removed from favorites');
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Remove favorite error:', error);
        req.flash('error', 'Error removing location from favorites');
        res.redirect('/dashboard');
    }
};

/**
 * Get user's favorite locations with current weather
 * @route GET /favorites
 * @access Private
 */
const getFavorites = async (req, res) => {
    try {
        // Fetch user with favorites populated
        const user = await User.findById(req.user.id).select('favorites');
        
        if (!user) {
            return res.render('pages/dashboard/favorites', {
                title: 'Favorite Locations',
                user: req.user,
                favorites: [],
                error: 'User not found',
                layout: 'layouts/main'
            });
        }

        console.log('User favorites:', user.favorites); // Add this for debugging
        
        return res.render('pages/dashboard/favorites', {
            title: 'Favorite Locations',
            user: req.user,
            favorites: user.favorites || [],
            error: null,
            layout: 'layouts/main'
        });

    } catch (error) {
        console.error('Get favorites error:', error);
        return res.render('pages/dashboard/favorites', {
            title: 'Favorite Locations',
            user: req.user,
            favorites: [],
            error: 'Error loading favorite locations',
            layout: 'layouts/main'
        });
    }
};

module.exports = {
    addFavorite,
    removeFavorite,
    getFavorites
};





