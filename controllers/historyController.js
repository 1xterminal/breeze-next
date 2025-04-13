const SearchHistory = require('../models/SearchHistory');

/**
 * Get search history page
 * @route GET /history
 * @access Private
 */
const getHistory = async (req, res) => {
    try {
        // Get all user's searches with a larger limit
        const searchHistory = await SearchHistory.getUserHistory(req.user.id, 20);

        return res.render('pages/history/index', {
            title: 'Search History',
            user: req.user,
            searchHistory,
            error: null,
            layout: 'layouts/main'
        });
    } catch (error) {
        console.error('History fetch error:', error);
        return res.render('pages/history/index', {
            title: 'Search History',
            user: req.user,
            searchHistory: [],
            error: 'Error loading search history',
            layout: 'layouts/main'
        });
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
    deleteSearch
};
