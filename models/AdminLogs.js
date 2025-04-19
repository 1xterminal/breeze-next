const mongoose = require('mongoose');

const AdminLogSchema = new mongoose.Schema({
  adminUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model
    required: true,
    index: true, // Index for potentially filtering logs by admin
  },
  adminUsername: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: [ // Define specific actions for consistency
      'CREATE_USER',
      'UPDATE_USER',
      'DELETE_USER',
      'ACTIVATE_USER',
      'DEACTIVATE_USER',
      'LOGIN_ADMIN',
      'LOGOUT_ADMIN',
      'UPDATE_SETTINGS',
      'CLEAR_LOGS',
      'VIEW_USER_LIST',
      'VIEW_USER_DETAILS',
      'UPDATE_USER_ROLE',
      'VIEW_SYSTEM_STATS',
      'UPDATE_FEEDBACK',
      'DELETE_FEEDBACK',
      'VIEW_FEEDBACK',
      'MANAGE_FEEDBACK',
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
    default: {},
  },
  ipAddress: { // Good practice to log IP for security audits
    type: String,
    required: true,
  },
}, {
  timestamps: true
});

// Index for faster queries
AdminLogSchema.index({ createdAt: -1 });
AdminLogSchema.index({ adminUserId: 1 });
AdminLogSchema.index({ action: 1 });

module.exports = mongoose.model('AdminLog', AdminLogSchema);