# Breeze Next - Weather Application

A modern weather application built with Node.js, Express, EJS, and TailwindCSS.

## Features

- **User Authentication**: Register, login, and secure access to user-specific features
- **Weather Dashboard**: Search for detailed weather information for any city
- **Weather Forecasts**: Get current conditions, hourly forecasts, and 7-day forecasts
- **Temperature Converter**: Convert between different temperature units
- **Search History**: View your past weather searches
- **Favorite Locations**: Save and quickly access your favorite locations
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/breeze-next.git

# Navigate to the project directory
cd breeze-next

# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Start the development server
npm run dev
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
MONGODB_URI=mongodb://localhost:27017/breeze_next
JWT_SECRET=your_jwt_secret_key
WEATHER_API_URL=https://api.open-meteo.com/v1/forecast
GEOCODE_API_URL=https://nominatim.openstreetmap.org
API_TIMEOUT=5000
APP_USER_AGENT=Breeze Weather App
```

## API Integration

### Weather Data (Open-Meteo)

This application uses the Open-Meteo API for weather data. The API provides:
- Current weather conditions
- Hourly forecasts up to 7 days
- Daily forecasts up to 7 days
- Various weather parameters (temperature, precipitation, wind, etc.)

### Geocoding (Nominatim)

For converting city names to coordinates, we use the Nominatim API from OpenStreetMap:
- Provides latitude and longitude coordinates for location names
- Returns detailed location information including display names
- Follows usage policy (implements appropriate request limits and User-Agent headers)

## Dashboard Implementation

The weather dashboard feature is implemented with the following components:

1. **Controller (dashboardController.js)**:
   - Handles the initial page load
   - Processes search requests
   - Makes API calls to Nominatim for geocoding and Open-Meteo for weather data
   - Formats the data for presentation

2. **Routes (dashboardRoutes.js)**:
   - Defines endpoints for the dashboard page and search functionality
   - Applies user authentication middleware

3. **View (views/pages/dashboard/index.ejs)**:
   - Presents a search form
   - Displays current weather conditions
   - Shows hourly forecast in a scrollable horizontal list
   - Presents 7-day forecast in a responsive grid

## License

This project is licensed under the MIT License - see the LICENSE file for details.

```bash
├── controllers/ # Route handlers for processing API requests
├── middleware/ # Middleware functions for handling requests
├── models/ # Database models
├── public/ # Static files (CSS, JS, images)
│ ├── assets/ # Additional assets
│ ├── css/ # CSS files
│ └── js/ # JS files
├── routes/ # API routes
├── utils/ # Utility functions
├── views/ # Template files
│ ├── components/ # Reusable components
│ ├── layouts/ # Base layout templates
│ └── pages/ # Main page templates
├── .env # Environment variables
├── .env.example # Environment variables example
├── index.js # Entry point
├── LICENSE # License
└── README.md # Project overview
```

## Environment Setup
1. Rename `.env.example` to `.env`
2. Configure environment variables in `.env`

## Installation
1. Clone the repository
2. Install dependencies
3. Start the server

```bash
npm install
npm start
```


