const Feedback = require('../models/Feedback');
const AdminLog = require('../models/AdminLogs');

/**
 * Get feedback submission form
 * @route GET /feedback/submit
 * @access Public
 */
const getSubmitForm = async (req, res) => {
    try {
        res.render('pages/feedback/submit', {
            title: 'Submit Feedback',
            user: req.user,
            layout: 'layouts/main'
        });
    } catch (error) {
        console.error('Get submit form error:', error);
        req.flash('error', 'Error loading feedback form');
        res.redirect('/');
    }
};

/**
 * Submit new feedback
 * @route POST /feedback/submit
 * @access Public
 */
const submitFeedback = async (req, res) => {
    try {
        const { feedbackType, message, locationContext } = req.body;
        
        // Create feedback object
        const feedbackData = {
            feedbackType,
            message,
            locationContext
        };

        // Add user info if logged in, otherwise use provided email
        if (req.user) {
            feedbackData.userId = req.user.id;
        } else {
            if (!req.body.submitterEmail) {
                req.flash('error', 'Email is required for anonymous feedback');
                return res.redirect('/feedback/submit');
            }
            feedbackData.submitterEmail = req.body.submitterEmail;
        }

        const feedback = await Feedback.create(feedbackData);

        req.flash('success', 'Thank you for your feedback!');
        res.redirect(req.user ? '/feedback/history' : '/');

    } catch (error) {
        console.error('Submit feedback error:', error);
        req.flash('error', 'Error submitting feedback');
        res.redirect('/feedback/submit');
    }
};

/**
 * Get user's feedback history
 * @route GET /feedback/history
 * @access Private
 */
const getFeedbackHistory = async (req, res) => {
    try {
        const feedback = await Feedback.find({ userId: req.user.id })
            .sort({ createdAt: -1 });

        res.render('pages/feedback/history', {
            title: 'My Feedback History',
            user: req.user,
            feedback,
            layout: 'layouts/main'
        });

    } catch (error) {
        console.error('Get feedback history error:', error);
        req.flash('error', 'Error loading feedback history');
        res.redirect('/');
    }
};

/**
 * Admin: List all feedback
 * @route GET /feedback/manage
 * @access Admin
 */
const listFeedback = async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Build filter query
        const filter = {};

        // Status filter
        if (req.query.status) {
            filter.status = req.query.status;
        }

        // Type filter
        if (req.query.feedbackType) {
            filter.feedbackType = req.query.feedbackType;
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
        const [feedback, totalItems] = await Promise.all([
            Feedback.find(filter)
                .populate('userId', 'username email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Feedback.countDocuments(filter)
        ]);

        // Calculate total pages
        const totalPages = Math.ceil(totalItems / limit);

        // Build query string for pagination links
        const queryParams = { ...req.query };
        delete queryParams.page;
        const queryString = Object.keys(queryParams).length 
            ? '&' + new URLSearchParams(queryParams).toString() 
            : '';

        res.render('pages/admin/feedback', {
            title: 'Manage Feedback',
            user: req.user,
            feedback,
            pagination: {
                current: page,
                total: totalPages,
                limit,
                totalItems
            },
            filters: {
                status: req.query.status || '',
                feedbackType: req.query.feedbackType || '',
                startDate: req.query.startDate || '',
                endDate: req.query.endDate || ''
            },
            queryString,
            layout: 'layouts/main'
        });

    } catch (error) {
        console.error('List feedback error:', error);
        req.flash('error', 'Error loading feedback list');
        res.redirect('/admin');
    }
};

/**
 * Admin: Update feedback status
 * @route POST /feedback/:id/update
 * @access Admin
 */
const updateFeedback = async (req, res) => {
    try {
        const { status, adminNotes } = req.body;
        const feedbackId = req.params.id;

        const feedback = await Feedback.findById(feedbackId);
        if (!feedback) {
            req.flash('error', 'Feedback not found');
            return res.redirect('/admin/feedback');
        }

        // Track if there are changes
        const changes = [];
        
        // Update status if changed
        if (status && status !== feedback.status) {
            feedback.status = status;
            changes.push(`Status changed to ${status}`);
        }

        // Update admin notes if provided and different
        if (adminNotes !== undefined && adminNotes !== feedback.adminNotes) {
            feedback.adminNotes = adminNotes;
            changes.push('Admin notes updated');
        }

        // Only save if there are changes
        if (changes.length > 0) {
            feedback.updatedAt = new Date();
            await feedback.save();

            // Log admin action
            await AdminLog.create({
                adminUserId: req.user.id,
                adminUsername: req.user.username,
                action: 'UPDATE_FEEDBACK',
                details: {
                    feedbackId,
                    changes,
                    newStatus: status,
                    notesUpdated: adminNotes !== feedback.adminNotes
                },
                ipAddress: req.ip
            });

            req.flash('success', `Feedback updated successfully: ${changes.join(', ')}`);
        } else {
            req.flash('info', 'No changes made to feedback');
        }

        res.redirect('/admin/feedback');
    } catch (error) {
        console.error('Update feedback error:', error);
        req.flash('error', 'Error updating feedback');
        res.redirect('/admin/feedback');
    }
};

/**
 * Admin: Delete feedback
 * @route POST /feedback/:id/delete
 * @access Admin
 */
const deleteFeedback = async (req, res) => {
    try {
        const feedbackId = req.params.id;

        const feedback = await Feedback.findById(feedbackId);
        if (!feedback) {
            req.flash('error', 'Feedback not found');
            return res.redirect('/admin/feedback');
        }

        await feedback.deleteOne();

        // Log admin action
        await AdminLog.create({
            adminUserId: req.user.id,
            adminUsername: req.user.username,
            action: 'DELETE_FEEDBACK',
            details: {
                feedbackId,
                feedbackType: feedback.feedbackType
            },
            ipAddress: req.ip
        });

        req.flash('success', 'Feedback deleted successfully');
        res.redirect('/admin/feedback');

    } catch (error) {
        console.error('Delete feedback error:', error);
        req.flash('error', 'Error deleting feedback');
        res.redirect('/admin/feedback');
    }
};

module.exports = {
    getSubmitForm,
    submitFeedback,
    getFeedbackHistory,
    listFeedback,
    updateFeedback,
    deleteFeedback
}; 