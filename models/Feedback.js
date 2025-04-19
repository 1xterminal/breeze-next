const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    submitterEmail: {
        type: String,
        validate: {
            validator: function(v) {
                // Only validate email if userId is not provided
                if (!this.userId) {
                    return /^\S+@\S+\.\S+$/.test(v);
                }
                return true;
            },
            message: 'Invalid email format'
        }
    },
    feedbackType: {
        type: String,
        enum: ['BUG_REPORT', 'DATA_INACCURACY', 'SUGGESTION', 'OTHER'],
        required: true,
        index: true
    },
    locationContext: {
        name: String,
        latitude: Number,
        longitude: Number
    },
    message: {
        type: String,
        required: true,
        trim: true,
        minlength: [10, 'Message must be at least 10 characters long']
    },
    status: {
        type: String,
        enum: ['NEW', 'VIEWED', 'INVESTIGATING', 'RESOLVED', 'WONT_FIX'],
        default: 'NEW',
        index: true
    },
    adminNotes: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index for efficient querying by status and date
FeedbackSchema.index({ status: 1, createdAt: -1 });

// Ensure either userId or submitterEmail is provided
FeedbackSchema.pre('save', function(next) {
    if (!this.userId && !this.submitterEmail) {
        next(new Error('Either userId or submitterEmail must be provided'));
    }
    next();
});

// Method to get feedback status history
FeedbackSchema.methods.getStatusHistory = function() {
    return this.model('FeedbackStatusHistory').find({
        feedbackId: this._id
    }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Feedback', FeedbackSchema); 