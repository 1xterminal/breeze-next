// handles user registration, login (for both users and admins), and admin login
// also logs admin actions to the AdminLogs collection

const { validationResult } = require('express-validator');
const User = require('../models/User'); 
const AdminLog = require('../models/AdminLogs');
const { registerValidationRules, loginValidationRules } = require('../utils/validators');

// Helper function to handle validation errors
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Return only the first error message for simplicity
    res.status(400).json({ message: errors.array({ onlyFirstError: true })[0].msg });
    return true; // Indicates validation errors were found and handled
  }
  return false; // Indicates no validation errors
};

// Helper function to create admin log entries
const logAdminAction = async (adminUserId, action, details = {}, ipAddress = null) => {
    try {
        const log = new AdminLog({
            adminUserId,
            action,
            details,
            ipAddress,
        });
        await log.save();
    } catch (error) {
        console.error(`Failed to log admin action (${action}):`, error);
        // Decide if this failure should impact the user response
    }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  // 1. Handle validation errors
  if (handleValidationErrors(req, res)) return;

  const { username, email, password } = req.body;

  try {
    // 2. Check if user already exists (by email or username)
    let user = await User.findOne({ $or: [{ email }, { username }] }).lean(); // .lean() for faster reads if only checking existence
    if (user) {
      const field = user.email === email ? 'Email' : 'Username';
      return res.status(400).json({ message: `${field} already exists.` });
    }

    // 3. Create new user instance (password hashing handled by pre-save hook in User model)
    // Role defaults to 'user' as defined in the schema
    const newUser = new User({
      username,
      email,
      password,
    });

    // 4. Save the user to the database
    await newUser.save();

    // 5. Generate JWT token using the method from the User model
    const token = await newUser.generateAuthToken();

    // 6. Send response (exclude password hash - newUser object won't have it after save if selected: false)
    // Select the fields to return explicitly or create a DTO (Data Transfer Object)
    res.status(201).json({
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      token,
      message: "User registered successfully."
    });

  } catch (error) {
    console.error('Registration Error:', error.message);
    // Handle potential errors during user save or token generation
    if (error.name === 'ValidationError') {
         return res.status(400).json({ message: "Validation failed. Please check your input."});
    }
     if (error.message.includes('Could not generate auth token')) {
        // Handle specific token generation error if needed
        return res.status(500).json({ message: 'Could not process registration.' });
    }
    res.status(500).json({ message: 'Server error during registration.' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  // Handle validation errors
  if (handleValidationErrors(req, res)) return;

  const { email, password } = req.body;

  try {
    // Check if user exists by email
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      // Use generic message for security to avoid revealing if email exists
      req.flash('error', 'Invalid credentials.');
      return res.redirect('/login');
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      req.flash('error', 'Invalid credentials.');
      return res.redirect('/login');
    }

    // Generate JWT token
    const token = await user.generateAuthToken();
    
    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      sameSite: 'strict'
    });
    
    // Set session
    req.session.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    // Redirect to home page
    req.flash('success', 'Login successful!');
    res.redirect('/');

  } catch (error) {
    console.error('Login Error:', error);
    req.flash('error', 'Server error during login.');
    res.redirect('/login');
  }
};

// Add a form-handling version of register
const registerUserForm = async (req, res) => {
  // Handle validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array()[0].msg);
    return res.redirect('/register');
  }

  const { username, email, password } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { username }] }).lean();
    if (user) {
      const field = user.email === email ? 'Email' : 'Username';
      req.flash('error', `${field} already exists.`);
      return res.redirect('/register');
    }

    // Create new user
    const newUser = new User({
      username,
      email,
      password,
    });

    await newUser.save();

    // Generate JWT token
    const token = await newUser.generateAuthToken();
    
    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      sameSite: 'strict'
    });
    
    // Set session
    req.session.user = {
      id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role
    };

    // Redirect to home page
    req.flash('success', 'Registration successful!');
    res.redirect('/');

  } catch (error) {
    console.error('Registration Error:', error);
    req.flash('error', 'Server error during registration.');
    res.redirect('/register');
  }
};

// @desc    Authenticate ADMIN & get token
// @route   POST /api/auth/admin/login
// @access  Public
const loginAdmin = async (req, res) => {
    // 1. Handle validation errors
    if (handleValidationErrors(req, res)) return;

    const { email, password } = req.body;

    try {
        // 2. Check if user exists by email
        const user = await User.findOne({ email }).select('+password'); // Need password to compare
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // 3. Check if the user is actually an admin
        if (user.role !== 'admin') {
            console.warn(`Login attempt for non-admin user: ${email}`);
            return res.status(403).json({ message: 'Access denied. Not an administrator.' }); // More specific error for admin route
        }

        // 4. Check if password matches
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            // Optionally log failed admin login attempts
            // await logAdminAction(user._id, 'LOGIN_ADMIN_FAILED', { reason: 'Invalid password' }, req.ip);
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // 5. Generate JWT token
        const token = await user.generateAuthToken();

        // 6. Log successful admin login
        await logAdminAction(user._id, 'LOGIN_ADMIN', {}, req.ip); // req.ip might need proxy configuration

        // 7. Send response
        res.status(200).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            token,
            message: "Admin login successful."
        });

    } catch (error) {
        console.error('Admin Login Error:', error);
        // Log unexpected errors during admin login attempt
        // await log  (null, 'LOGIN_ADMIN_ERROR', { error: error.message }, req.ip);
         if (error.message.includes('Could not generate auth token')) {
            return res.status(500).json({ message: 'Could not process admin login.' });
        }
        res.status(500).json({ message: 'Server error during admin login.' });
    }
};

module.exports = {
  registerUser,
  loginUser,
  loginAdmin,
  registerUserForm
};
