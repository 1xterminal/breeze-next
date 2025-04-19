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
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Build filter query
        const filter = {};

        // Role filter
        if (req.query.role && ['user', 'admin'].includes(req.query.role)) {
            filter.role = req.query.role;
        }

        // Search by username or email
        if (req.query.search) {
            filter.$or = [
                { username: new RegExp(req.query.search, 'i') },
                { email: new RegExp(req.query.search, 'i') }
            ];
        }

        // Sorting
        let sort = { createdAt: -1 }; // Default sort
        if (req.query.sortBy) {
            switch (req.query.sortBy) {
                case 'username':
                    sort = { username: req.query.sortOrder === 'desc' ? -1 : 1 };
                    break;
                case 'email':
                    sort = { email: req.query.sortOrder === 'desc' ? -1 : 1 };
                    break;
                case 'lastLogin':
                    sort = { lastLoginAt: req.query.sortOrder === 'desc' ? -1 : 1 };
                    break;
                case 'created':
                    sort = { createdAt: req.query.sortOrder === 'desc' ? -1 : 1 };
                    break;
            }
        }

        // Get system stats for the last 24 hours
        const oneDayAgo = new Date(Date.now() - 24*60*60*1000);
        
        const [
            totalUsers,
            totalSearches,
            recentSearches,
            newUsers,
            users,
            recentLogs,
            filteredUsers,
            totalFilteredUsers
        ] = await Promise.all([
            User.countDocuments(),
            SearchHistory.countDocuments(),
            SearchHistory.countDocuments({ createdAt: { $gte: oneDayAgo } }),
            User.countDocuments({ createdAt: { $gte: oneDayAgo } }),
            User.find().select('-password').sort({ createdAt: -1 }).limit(5),
            AdminLog.find().sort({ createdAt: -1 }).limit(5),
            User.find(filter)
                .select('-password')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(filter)
        ]);

        const stats = {
            totalUsers,
            totalSearches,
            recentSearches,
            newUsers
        };

        // Calculate total pages
        const totalPages = Math.ceil(totalFilteredUsers / limit);

        // Build query string for pagination links
        const queryParams = { ...req.query };
        delete queryParams.page;
        const queryString = Object.keys(queryParams).length 
            ? '&' + new URLSearchParams(queryParams).toString() 
            : '';

        return res.render('pages/admin/index', {
            title: 'Admin Dashboard',
            currentUser: req.user,
            user: req.user,
            stats,
            users: filteredUsers,
            recentLogs,
            pagination: {
                current: page,
                total: totalPages,
                limit,
                totalItems: totalFilteredUsers
            },
            filters: {
                role: req.query.role || '',
                search: req.query.search || '',
                sortBy: req.query.sortBy || 'created',
                sortOrder: req.query.sortOrder || 'desc'
            },
            queryString,
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
 * Get system logs with filtering, sorting, and pagination
 * @route GET /admin/logs
 * @access Admin
 */
const getLogs = async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Sorting parameters
        const sortField = req.query.sortField || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        const sort = { [sortField]: sortOrder };

        // Build filter query
        const filter = {};

        // Admin username/ID filter
        if (req.query.adminUsername) {
            filter.adminUsername = new RegExp(req.query.adminUsername, 'i');
        }
        if (req.query.adminUserId) {
            filter.adminUserId = req.query.adminUserId;
        }

        // Action filter
        if (req.query.action) {
            filter.action = req.query.action;
        }

        // Target user filter
        if (req.query.targetUserId) {
            filter.targetUserId = req.query.targetUserId;
        }

        // IP address filter
        if (req.query.ipAddress) {
            filter.ipAddress = new RegExp(req.query.ipAddress, 'i');
        }

        // Date range filter
        if (req.query.startDate || req.query.endDate) {
            filter.createdAt = {};
            if (req.query.startDate) {
                filter.createdAt.$gte = new Date(req.query.startDate);
            }
            if (req.query.endDate) {
                filter.createdAt.$lte = new Date(req.query.endDate);
            }
        }

        // Execute queries
        const [logs, totalLogs, actions, admins] = await Promise.all([
            AdminLog.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate('adminUserId', 'username')
                .populate('targetUserId', 'username'),
            AdminLog.countDocuments(filter),
            AdminLog.distinct('action'),
            User.find({ role: 'admin' }).select('username _id')
        ]);

        // Calculate pagination info
        const totalPages = Math.ceil(totalLogs / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        // Get unique IP addresses for filter dropdown
        const uniqueIPs = await AdminLog.distinct('ipAddress');

        return res.render('pages/admin/logs', {
            title: 'System Logs',
            user: req.user,
            logs,
            totalLogs,
            pagination: {
                current: page,
                total: totalPages,
                hasNext: hasNextPage,
                hasPrev: hasPrevPage,
                limit
            },
            filters: {
                adminUsername: req.query.adminUsername || '',
                adminUserId: req.query.adminUserId || '',
                action: req.query.action || '',
                targetUserId: req.query.targetUserId || '',
                ipAddress: req.query.ipAddress || '',
                startDate: req.query.startDate || '',
                endDate: req.query.endDate || ''
            },
            sorting: {
                field: sortField,
                order: sortOrder === 1 ? 'asc' : 'desc'
            },
            filterOptions: {
                actions,
                admins,
                ipAddresses: uniqueIPs
            },
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

// const exportLogs = async (req, res) => {
//     try {
//         const logs = await AdminLog.find().sort({ createdAt: -1 });
        
//         // Format logs for CSV
//         const csvData = logs.map(log => ({
//             timestamp: log.createdAt.toISOString(),
//             level: log.level,
//             message: log.message,
//             user: log.adminUserId?.username || 'system',
//             ip: log.ipAddress || 'N/A'
//         }));

//         // Set headers for CSV download
//         res.setHeader('Content-Type', 'text/csv');
//         res.setHeader('Content-Disposition', 'attachment; filename=system-logs.csv');

//         // Write CSV header
//         res.write('Timestamp,Level,Message,User,IP\n');

//         // Write each log entry
//         csvData.forEach(log => {
//             res.write(`${log.timestamp},${log.level},"${log.message.replace(/"/g, '""')}",${log.user},${log.ip}\n`);
//         });

//         res.end();
//     } catch (error) {
//         console.error('Error exporting logs:', error);
//         req.flash('error', 'Failed to export logs');
//         res.redirect('/admin/logs');
//     }
// };

module.exports = {
    getDashboard,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    getLogs,
    getSettings,
    clearCache,
    clearOldLogs,
    // exportLogs
};









