const SearchHistory = require('../models/SearchHistory');
const User = require('../models/User');
const { convertTemperature, formatTemperature } = require('../utils/temperatureConverter');

/**
 * Get search history page with filtering and pagination
 * @route GET /history
 * @access Private
 */
const getHistory = async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;

        // Build filter query
        const filter = { userId: req.user.id };

        // Location filter (case-insensitive partial match)
        if (req.query.location) {
            filter['location.name'] = new RegExp(req.query.location, 'i');
        }

        // Date range filter
        if (req.query.startDate || req.query.endDate) {
            filter.searchedAt = {};
            if (req.query.startDate) {
                filter.searchedAt.$gte = new Date(req.query.startDate);
            }
            if (req.query.endDate) {
                filter.searchedAt.$lte = new Date(req.query.endDate);
            }
        }

        // Temperature range filter
        if (req.query.minTemp || req.query.maxTemp) {
            filter['weatherSnapshot.current.temperature'] = {};
            if (req.query.minTemp) {
                filter['weatherSnapshot.current.temperature'].$gte = parseFloat(req.query.minTemp);
            }
            if (req.query.maxTemp) {
                filter['weatherSnapshot.current.temperature'].$lte = parseFloat(req.query.maxTemp);
            }
        }

        // Get user's searches with pagination
        const [searchHistory, totalItems] = await Promise.all([
            SearchHistory.find(filter)
                .sort({ searchedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            SearchHistory.countDocuments(filter)
        ]);

        // Calculate total pages
        const totalPages = Math.ceil(totalItems / limit);

        // Build query string for pagination links
        const queryParams = { ...req.query };
        delete queryParams.page;
        const queryString = Object.keys(queryParams).length 
            ? '&' + new URLSearchParams(queryParams).toString() 
            : '';

        return res.render('pages/history/index', {
            title: 'Search History',
            user: req.user,
            searchHistory,
            error: null,
            page,
            limit,
            totalItems,
            totalPages,
            queryString,
            filters: {
                location: req.query.location || '',
                startDate: req.query.startDate || '',
                endDate: req.query.endDate || '',
                minTemp: req.query.minTemp || '',
                maxTemp: req.query.maxTemp || ''
            },
            convertTemperature,
            formatTemperature,
            layout: 'layouts/main'
        });
    } catch (error) {
        console.error('History fetch error:', error);
        return res.render('pages/history/index', {
            title: 'Search History',
            user: req.user,
            searchHistory: [],
            error: 'Error loading search history',
            page: 1,
            limit: 20,
            totalItems: 0,
            totalPages: 1,
            queryString: '',
            filters: {
                location: '',
                startDate: '',
                endDate: '',
                minTemp: '',
                maxTemp: ''
            },
            convertTemperature,
            formatTemperature,
            layout: 'layouts/main'
        });
    }
};

/**
 * View historical weather data
 * @route GET /history/:id
 * @access Private
 */
const viewHistoricalWeather = async (req, res) => {
    try {
        const searchId = req.params.id;
        const search = await SearchHistory.findOne({
            _id: searchId,
            userId: req.user.id
        }).lean();

        if (!search) {
            req.flash('error', 'Search history entry not found');
            return res.redirect('/history');
        }

        // Get user's current temperature unit preference
        const user = await User.findById(req.user.id).select('settings');
        const preferredUnit = user?.settings?.temperatureUnit || 'celsius';

        // Format the weather data to match the dashboard structure
        const weatherData = {
            current: {
                ...search.weatherSnapshot.current,
                location: search.location.name,
                latitude: search.location.latitude,
                longitude: search.location.longitude,
                originalUnit: 'celsius' // OpenMeteo always returns in Celsius
            },
            hourlyForecast: search.weatherSnapshot.hourly.map(hour => ({
                time: hour.time,
                temperature: hour.temperature,
                precipitationProbability: hour.precipitationProbability,
                weatherCode: hour.weatherCode,
                description: hour.description,
                originalUnit: 'celsius'
            })),
            dailyForecast: search.weatherSnapshot.daily.map(day => ({
                date: day.date,
                maxTemp: day.maxTemp,
                minTemp: day.minTemp,
                precipitationSum: day.precipitationSum,
                precipitationProbability: day.precipitationProbability,
                weatherCode: day.weatherCode,
                description: day.description,
                originalUnit: 'celsius'
            }))
        };

        // Get recent searches for the sidebar
        const recentSearches = await SearchHistory.find({ userId: req.user.id })
            .sort({ searchedAt: -1 })
            .limit(5)
            .lean();

        return res.render('pages/dashboard/index', {
            title: 'Historical Weather',
            user: req.user,
            weather: weatherData,
            searchQuery: search.location.name,
            recentSearches: recentSearches,
            error: null,
            isHistorical: true,
            searchDate: search.searchedAt,
            originalUnit: 'celsius', // Add this to indicate original temperature unit
            layout: 'layouts/main'
        });

    } catch (error) {
        console.error('View historical weather error:', error);
        req.flash('error', 'Error viewing historical weather data');
        return res.redirect('/history');
    }
};

/**
 * Clear search history
 * @route POST /history/clear
 * @access Private
 */
const clearHistory = async (req, res) => {
    try {
        await SearchHistory.deleteMany({ userId: req.user.id });
        req.flash('success', 'Search history cleared successfully');
        res.redirect('/history');
    } catch (error) {
        console.error('History clear error:', error);
        req.flash('error', 'Error clearing search history');
        res.redirect('/history');
    }
};

/**
 * Delete a specific search from history
 * @route DELETE /history/:id
 * @access Private
 */
const deleteSearch = async (req, res) => {
    try {
        const searchId = req.params.id;
        await SearchHistory.findOneAndDelete({
            _id: searchId,
            userId: req.user.id
        });
        req.flash('success', 'Search entry deleted successfully');
        res.redirect('/history');
    } catch (error) {
        console.error('Search delete error:', error);
        req.flash('error', 'Error deleting search entry');
        res.redirect('/history');
    }
};

module.exports = {
    getHistory,
    clearHistory,
    deleteSearch,
    viewHistoricalWeather
};
