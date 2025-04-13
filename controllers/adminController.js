const User = require('../models/User');
const SearchHistory = require('../models/SearchHistory');
const AdminLog = require('../models/AdminLogs');
const WeatherCache = require('../models/WeatherCache');
const bcrypt = require('bcrypt');

/**
 * Get admin dashboard
 * @route GET /admin
 * @access Admin
 */
const getDashboard = async (req, res) => {
    try {
        // Get system stats for the last 24 hours
        const oneDayAgo = new Date(Date.now() - 24*60*60*1000);
        
        const [
            totalUsers,
            totalSearches,
            recentSearches,
            newUsers,
            users,
            recentLogs
        ] = await Promise.all([
            User.countDocuments(),
            SearchHistory.countDocuments(),
            SearchHistory.countDocuments({ createdAt: { $gte: oneDayAgo } }),
            User.countDocuments({ createdAt: { $gte: oneDayAgo } }),
            User.find().select('-password').sort({ createdAt: -1 }).limit(10),
            AdminLog.find().sort({ createdAt: -1 }).limit(10)
        ]);

        const stats = {
            totalUsers,
            totalSearches,
            recentSearches,
            newUsers
        };

        // Get all users for the user management table
        const allUsers = await User.find()
            .select('-password')
            .sort({ createdAt: -1 });

        return res.render('pages/admin/index', {
            title: 'Admin Dashboard',
            currentUser: req.user,
            user: req.user,
            stats,
            users: allUsers,
            recentLogs,
            layout: 'layouts/main'
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        req.flash('error', 'Error loading admin dashboard');
        return res.redirect('/');
    }
};

/**
 * Get user details
 * @route GET /admin/users/:id
 * @access Admin
 */
const getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password')
            .populate('searchHistory')
            .populate('favorites');

        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/admin');
        }

        return res.render('pages/admin/user-details', {
            title: 'User Details',
            user: req.user,
            targetUser: user,
            layout: 'layouts/main'
        });
    } catch (error) {
        console.error('Get user error:', error);
        req.flash('error', 'Error fetching user details');
        return res.redirect('/admin');
    }
};

/**
 * Get system logs
 * @route GET /admin/logs
 * @access Admin
 */
const getLogs = async (req, res) => {
    try {
        const logs = await AdminLog.find()
            .sort({ createdAt: -1 })
            .limit(100)
            .populate('adminUserId', 'username')
            .populate('targetUserId', 'username');

        return res.render('pages/admin/logs', {
            title: 'System Logs',
            user: req.user,
            logs,
            layout: 'layouts/main'
        });
    } catch (error) {
        console.error('Get logs error:', error);
        req.flash('error', 'Error fetching system logs');
        return res.redirect('/admin');
    }
};

/**
 * Get system settings
 * @route GET /admin/settings
 * @access Admin
 */
const getSettings = async (req, res) => {
    try {
        // Get system stats
        const [totalUsers, totalSearches, totalLogs] = await Promise.all([
            User.countDocuments(),
            SearchHistory.countDocuments(),
            AdminLog.countDocuments()
        ]);

        return res.render('pages/admin/settings', {
            title: 'System Settings',
            user: req.user,
            stats: {
                totalUsers,
                totalSearches,
                totalLogs
            },
            layout: 'layouts/main'
        });
    } catch (error) {
        console.error('Get settings error:', error);
        req.flash('error', 'Error loading system settings');
        return res.redirect('/admin');
    }
};

/**
 * Clear weather cache
 * @route POST /admin/settings/clear-cache
 * @access Admin
 */
const clearCache = async (req, res) => {
    try {
        await WeatherCache.deleteMany({});
        
        // Log the action
        await AdminLog.create({
            adminUserId: req.user.id,
            adminUsername: req.user.username,
            action: 'CLEAR_CACHE',
            details: { timestamp: new Date() },
            ipAddress: req.ip
        });

        req.flash('success', 'Weather cache cleared successfully');
        return res.redirect('/admin/settings');
    } catch (error) {
        console.error('Clear cache error:', error);
        req.flash('error', 'Error clearing weather cache');
        return res.redirect('/admin/settings');
    }
};

/**
 * Clear old system logs
 * @route POST /admin/settings/clear-logs
 * @access Admin
 */
const clearOldLogs = async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result = await AdminLog.deleteMany({
            createdAt: { $lt: thirtyDaysAgo }
        });

        // Log the action
        await AdminLog.create({
            adminUserId: req.user.id,
            adminUsername: req.user.username,
            action: 'CLEAR_OLD_LOGS',
            details: { 
                deletedCount: result.deletedCount,
                olderThan: thirtyDaysAgo
            },
            ipAddress: req.ip
        });

        req.flash('success', `Cleared ${result.deletedCount} old log entries`);
        return res.redirect('/admin/settings');
    } catch (error) {
        console.error('Clear logs error:', error);
        req.flash('error', 'Error clearing old logs');
        return res.redirect('/admin/settings');
    }
};

/**
 * Create new user
 * @route POST /admin/users
 * @access Admin
 */
const createUser = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            req.flash('error', 'User with this email or username already exists');
            return res.redirect('/admin');
        }

        // Create new user
        const user = new User({
            username,
            email,
            password,
            role: role || 'user'
        });

        await user.save();

        // Log action
        await AdminLog.create({
            adminUserId: req.user.id,
            adminUsername: req.user.username,
            action: 'CREATE_USER',
            targetUserId: user._id,
            details: { username, email, role },
            ipAddress: req.ip
        });

        req.flash('success', 'User created successfully');
        return res.redirect('/admin');
    } catch (error) {
        console.error('Create user error:', error);
        req.flash('error', 'Error creating user');
        return res.redirect('/admin');
    }
};

/**
 * Update user
 * @route PUT /admin/users/:id
 * @access Admin
 */
const updateUser = async (req, res) => {
    try {
        const { username, email, role, password } = req.body;
        const userId = req.params.id;

        // Check if email/username is taken by another user
        const existingUser = await User.findOne({
            _id: { $ne: userId },
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            req.flash('error', 'Email or username already taken');
            return res.redirect('/admin');
        }

        // Prepare update data
        const updateData = {
            username,
            email,
            role
        };

        // Only update password if provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        // Update user
        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true }
        );

        // Log action
        await AdminLog.create({
            adminUserId: req.user.id,
            adminUsername: req.user.username,
            action: 'UPDATE_USER',
            targetUserId: user._id,
            details: { 
                username, 
                email, 
                role,
                passwordChanged: !!password 
            },
            ipAddress: req.ip
        });

        req.flash('success', 'User updated successfully');
        return res.redirect('/admin');
    } catch (error) {
        console.error('Update user error:', error);
        req.flash('error', 'Error updating user');
        return res.redirect('/admin');
    }
};

/**
 * Delete user
 * @route DELETE /admin/users/:id
 * @access Admin
 */
const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;

        // Don't allow deleting self
        if (userId === req.user.id) {
            req.flash('error', 'Cannot delete your own account');
            return res.redirect('/admin');
        }

        const user = await User.findById(userId);
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/admin');
        }

        // Delete user's data
        await Promise.all([
            SearchHistory.deleteMany({ userId }),
            User.findByIdAndDelete(userId)
        ]);

        // Log action
        await AdminLog.create({
            adminUserId: req.user.id,
            adminUsername: req.user.username,
            action: 'DELETE_USER',
            details: { 
                deletedUsername: user.username,
                deletedEmail: user.email
            },
            ipAddress: req.ip
        });

        req.flash('success', 'User and associated data deleted successfully');
        return res.redirect('/admin');
    } catch (error) {
        console.error('Delete user error:', error);
        req.flash('error', 'Error deleting user');
        return res.redirect('/admin');
    }
};

module.exports = {
    getDashboard,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    getLogs,
    getSettings,
    clearCache,
    clearOldLogs
};
