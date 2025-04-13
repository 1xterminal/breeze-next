const mongoose = require('mongoose');

const AdminLogSchema = new mongoose.Schema({
  adminUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model
    required: true,
    index: true, // Index for potentially filtering logs by admin
  },
  action: {
    type: String,
    required: true,
    enum: [ // Define specific actions for consistency
      'LOGIN_ADMIN',
      'VIEW_USER_LIST',
      'VIEW_USER_DETAILS',
      'UPDATE_USER_ROLE',
      'DELETE_USER',
      'VIEW_SYSTEM_STATS',
      // Add more specific admin actions as needed
    ],
  },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Optional reference to a user affected by the action
    index: true, // Index if you filter logs by target user
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // Store any extra context, like old/new values on an update
  },
  ipAddress: { // Good practice to log IP for security audits
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

AdminLogSchema.index({ timestamp: -1 }); // Index for sorting logs chronologically

module.exports = mongoose.model('AdminLog', AdminLogSchema);