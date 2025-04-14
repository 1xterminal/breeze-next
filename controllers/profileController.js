const User = require('../models/User');
const bcrypt = require('bcrypt');

/**
 * Get profile page
 * @route GET /profile
 * @access Private
 */
const getProfile = async (req, res) => {
    try {
        // Get fresh user data with all fields
        const user = await User.findById(req.user.id)
            .select('+searchHistory +favorites');

        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/');
        }

        return res.render('pages/profile/index', {
            title: 'My Profile',
            user: user,
            error: null,
            layout: 'layouts/main'
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        req.flash('error', 'Error loading profile');
        return res.redirect('/');
    }
};

/**
 * Update user settings
 * @route POST /profile/settings
 * @access Private
 */
const updateSettings = async (req, res) => {
    try {
        const { temperatureUnit, description } = req.body;

        // Validate temperature unit
        if (temperatureUnit && !['celsius', 'fahrenheit', 'kelvin'].includes(temperatureUnit)) {
            req.flash('error', 'Invalid temperature unit');
            return res.redirect('/profile');
        }

        // Update user settings
        await User.findByIdAndUpdate(req.user.id, {
            'settings.temperatureUnit': temperatureUnit,
            'profile.description': description
        });

        req.flash('success', 'Settings updated successfully');
        res.redirect('/profile');
    } catch (error) {
        console.error('Settings update error:', error);
        req.flash('error', 'Error updating settings');
        res.redirect('/profile');
    }
};

/**
 * Change user password
 * @route POST /profile/change-password
 * @access Private
 */
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Validate password match
        if (newPassword !== confirmPassword) {
            req.flash('error', 'New passwords do not match');
            return res.redirect('/profile');
        }

        // Get user with password
        const user = await User.findById(req.user.id).select('+password');
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/profile');
        }

        // Check current password
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            req.flash('error', 'Current password is incorrect');
            return res.redirect('/profile');
        }

        // Update password
        user.password = newPassword;
        await user.save();

        req.flash('success', 'Password updated successfully');
        res.redirect('/profile');
    } catch (error) {
        console.error('Password change error:', error);
        req.flash('error', 'Error changing password');
        res.redirect('/profile');
    }
};

module.exports = {
    getProfile,
    updateSettings,
    changePassword
};



