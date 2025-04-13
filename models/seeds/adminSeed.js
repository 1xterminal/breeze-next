const mongoose = require('mongoose');
const User = require('../User');
require('dotenv').config();

const adminUsers = [
    {
        username: 'admin',
        email: 'admin@breeze.com',
        password: 'admin123',
        role: 'admin'
    },
    {
        username: 'superadmin',
        email: 'superadmin@breeze.com',
        password: 'super123',
        role: 'admin'
    }
];

const seedAdmins = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

        // Check if admin users already exist
        const existingAdmins = await User.find({ role: 'admin' });
        if (existingAdmins.length > 0) {
            console.log('Admin users already exist. Skipping seed...');
            process.exit(0);
        }

        // Create admin users
        const createdAdmins = await User.create(adminUsers);
        console.log('Admin users created successfully:', createdAdmins.map(admin => admin.username));
        process.exit(0);
    } catch (error) {
        console.error('Error seeding admin users:', error);
        process.exit(1);
    }
};

// Run the seed
seedAdmins(); 