const User = require('../models/User');

/**
 * Add a location to favorites
 * @route POST /favorites/add
 * @access Private
 */
const addFavorite = async (req, res) => {
    try {
        console.log('Add Favorite - Request Body:', req.body);
        
        const { name, latitude, longitude, customName } = req.body;

        // Enhanced validation
        if (!name || !latitude || !longitude || isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
            console.log('Validation Failed:', {
                hasName: !!name,
                hasLatitude: !!latitude,
                hasLongitude: !!longitude,
                parsedLatitude: parseFloat(latitude),
                parsedLongitude: parseFloat(longitude)
            });
            req.flash('error', 'Invalid location data. Please try again.');
            return res.redirect('/dashboard');
        }

        const user = await User.findById(req.user.id);
        console.log('Current User Favorites:', user.favorites);
        
        // Check if location already exists in favorites
        const exists = user.favorites.some(fav => 
            Math.abs(fav.latitude - parseFloat(latitude)) < 0.0001 && 
            Math.abs(fav.longitude - parseFloat(longitude)) < 0.0001
        );

        if (exists) {
            console.log('Location already exists in favorites');
            req.flash('info', 'Location already in favorites');
            return res.redirect('/dashboard');
        }

        // Add to favorites with enhanced data
        const newFavorite = {
            customName: customName || name, // Use provided custom name or fallback to location name
            name,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            notes: '',
            category: 'OTHER',
            tags: [],
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
 * Update a favorite location
 * @route POST /favorites/:id/update
 * @access Private
 */
const updateFavorite = async (req, res) => {
    try {
        const { favoriteId } = req.params;
        const { customName, notes, category, tags } = req.body;

        const user = await User.findById(req.user.id);
        const favorite = user.favorites.id(favoriteId);

        if (!favorite) {
            if (req.xhr) {
                return res.status(404).json({ message: 'Favorite location not found' });
            }
            req.flash('error', 'Favorite location not found');
            return res.redirect('/favorites');
        }

        // Update fields
        favorite.customName = customName || favorite.customName;
        favorite.notes = notes || favorite.notes;
        favorite.category = category || favorite.category;
        favorite.tags = tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())) : favorite.tags;

        await user.save();

        if (req.xhr) {
            return res.json({ 
                message: 'Favorite location updated',
                favorite: favorite
            });
        }

        req.flash('success', 'Favorite location updated');
        res.redirect('/favorites');

    } catch (error) {
        console.error('Update favorite error:', error);
        if (req.xhr) {
            return res.status(500).json({ message: 'Error updating favorite location' });
        }
        req.flash('error', 'Error updating favorite location');
        res.redirect('/favorites');
    }
};

/**
 * Get user's favorite locations with sorting and filtering
 * @route GET /favorites
 * @access Private
 */
const getFavorites = async (req, res) => {
    try {
        // Get query parameters
        const sortBy = req.query.sortBy || 'customName';
        const sortOrder = req.query.sortOrder || 'asc';
        const category = req.query.category;
        const search = req.query.search;
        const tag = req.query.tag;

        // Fetch user with favorites
        const user = await User.findById(req.user.id).select('favorites settings');
        
        if (!user) {
            return res.render('pages/dashboard/favorites', {
                title: 'Favorite Locations',
                user: req.user,
                favorites: [],
                error: 'User not found',
                sortBy,
                sortOrder,
                category,
                search,
                tag,
                layout: 'layouts/main'
            });
        }

        // Filter and sort favorites
        let favorites = [...user.favorites];

        // Apply category filter
        if (category && category !== 'ALL') {
            favorites = favorites.filter(fav => fav.category === category);
        }

        // Apply search filter
        if (search) {
            const searchLower = search.toLowerCase();
            favorites = favorites.filter(fav => 
                fav.customName.toLowerCase().includes(searchLower) ||
                fav.name.toLowerCase().includes(searchLower) ||
                fav.notes.toLowerCase().includes(searchLower)
            );
        }

        // Apply tag filter
        if (tag) {
            favorites = favorites.filter(fav => fav.tags.includes(tag));
        }

        // Sort favorites
        favorites.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'customName':
                    comparison = a.customName.localeCompare(b.customName);
                    break;
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'category':
                    comparison = a.category.localeCompare(b.category);
                    break;
                case 'date':
                    comparison = new Date(a.createdAt) - new Date(b.createdAt);
                    break;
                default:
                    comparison = a.customName.localeCompare(b.customName);
            }
            return sortOrder === 'desc' ? -comparison : comparison;
        });

        // Get unique tags for filter dropdown
        const allTags = [...new Set(user.favorites.flatMap(fav => fav.tags))];
        
        return res.render('pages/dashboard/favorites', {
            title: 'Favorite Locations',
            user: req.user,
            favorites,
            error: null,
            sortBy,
            sortOrder,
            category,
            search,
            tag,
            allTags,
            categories: ['HOME', 'WORK', 'VACATION', 'FREQUENT', 'POI', 'OTHER'],
            layout: 'layouts/main'
        });

    } catch (error) {
        console.error('Get favorites error:', error);
        return res.render('pages/dashboard/favorites', {
            title: 'Favorite Locations',
            user: req.user,
            favorites: [],
            error: 'Error loading favorite locations',
            sortBy: 'customName',
            sortOrder: 'asc',
            layout: 'layouts/main'
        });
    }
};

module.exports = {
    addFavorite,
    removeFavorite,
    updateFavorite,
    getFavorites
};









