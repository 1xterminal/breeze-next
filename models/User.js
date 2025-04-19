const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { SignJWT } = require('jose');
const { TextEncoder } = require('util');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Username is required"],
    unique: true,
    trim: true,
    minlength: [3, "Username must be at least 3 characters"]
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters"]
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  lastLoginAt: {
    type: Date,
    default: Date.now
  },
  profile: {
    description: { type: String, default: '' },
    image: { type: String, default: 'default.jpg' } 
  },
  settings: {
    temperatureUnit: { 
      type: String, 
      enum: ['celsius', 'fahrenheit', 'kelvin'],
      default: 'celsius'
    }
  },
  favorites: [{
    customName: { type: String, required: true },
    name: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    notes: { type: String, default: '' },
    category: {
      type: String,
      enum: ['HOME', 'WORK', 'VACATION', 'FREQUENT', 'POI', 'OTHER'],
      default: 'OTHER'
    },
    tags: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
  }],
  searchHistory: [{
    query: String,
    name: String,
    latitude: Number,
    longitude: Number,
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Password hashing middleware
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password validity
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Simplified JWT generation
UserSchema.methods.generateAuthToken = async function() {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    
    const token = await new SignJWT({ 
      id: this._id.toString(),
      role: this.role 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);
      
    return token;
  } catch (error) {
    console.error('Error generating JWT:', error);
    throw new Error('Could not generate auth token');
  }
};

// Method to get sorted favorites
UserSchema.methods.getSortedFavorites = function(sortBy = 'name', sortOrder = 'asc') {
    let favorites = [...this.favorites];
    
    switch (sortBy) {
        case 'name':
            favorites.sort((a, b) => {
                return sortOrder === 'asc' 
                    ? a.name.localeCompare(b.name)
                    : b.name.localeCompare(a.name);
            });
            break;
        case 'date':
            favorites.sort((a, b) => {
                return sortOrder === 'asc'
                    ? new Date(a.createdAt) - new Date(b.createdAt)
                    : new Date(b.createdAt) - new Date(a.createdAt);
            });
            break;
        default:
            // Default to sorting by name ascending
            favorites.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return favorites;
};

module.exports = mongoose.model('User', UserSchema);
