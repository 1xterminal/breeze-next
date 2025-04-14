const axios = require('axios');
const WeatherCache = require('../models/WeatherCache');
const { convertTemperature, getUnitSymbol } = require('../utils/temperatureConverter');
const User = require('../models/User');
require('dotenv').config();

// Create API clients
const weatherApi = axios.create({
    baseURL: process.env.WEATHER_API_URL,
    timeout: parseInt(process.env.API_TIMEOUT) || 5000
});

const geocodeApi = axios.create({
    baseURL: process.env.GEOCODE_API_URL,
    timeout: parseInt(process.env.API_TIMEOUT) || 5000,
    headers: {
        'User-Agent': process.env.APP_USER_AGENT
    }
});

// Helper functions
const getCoordinates = async (city) => {
    try {
        const response = await geocodeApi.get('/search', {
            params: {
                format: 'json',
                q: city,
                limit: 1
            }
        });

        if (!response.data.length) {
            throw new Error('City not found');
        }

        return {
            lat: response.data[0].lat,
            lon: response.data[0].lon,
            displayName: response.data[0].display_name
        };
    } catch (error) {
        console.error('Geocoding Error:', error);
        throw error;
    }
};

const getWeatherDescription = (code) => {
    const weatherCodes = {
        0: 'Clear Sky',
        1: 'Mainly Clear',
        2: 'Partly Cloudy',
        3: 'Overcast',
        45: 'Fog',
        48: 'Depositing Rime Fog',
        51: 'Light Drizzle',
        53: 'Moderate Drizzle',
        55: 'Dense Drizzle',
        56: 'Light Freezing Drizzle',
        57: 'Dense Freezing Drizzle',
        61: 'Slight Rain',
        63: 'Moderate Rain',
        65: 'Heavy Rain',
        66: 'Light Freezing Rain',
        67: 'Heavy Freezing Rain',
        71: 'Slight Snow Fall',
        73: 'Moderate Snow Fall',
        75: 'Heavy Snow Fall',
        77: 'Snow Grains',
        80: 'Slight Rain Showers',
        81: 'Moderate Rain Showers',
        82: 'Violent Rain Showers',
        85: 'Slight Snow Showers',
        86: 'Heavy Snow Showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with Slight Hail',
        99: 'Thunderstorm with Heavy Hail'
    };
    return weatherCodes[code] || 'Unknown';
};

const getWeatherIcon = (code) => {
    const hour = new Date().getHours();
    const isNight = hour >= 19 || hour < 6;
    const prefix = isNight && [0, 1, 2, 3].includes(code) ? 'night-' : '';
    
    const iconMap = {
        0: prefix + 'clear-day',
        1: prefix + 'mostly-clear-day',
        2: prefix + 'partly-cloudy-day',
        3: 'cloudy',
        45: 'fog',
        48: 'fog',
        51: 'drizzle',
        53: 'drizzle',
        55: 'drizzle',
        56: 'freezing-drizzle',
        57: 'freezing-drizzle',
        61: 'light-rain',
        63: 'rain',
        65: 'heavy-rain',
        66: 'freezing-rain',
        67: 'freezing-rain',
        71: 'light-snow',
        73: 'snow',
        75: 'heavy-snow',
        77: 'snow',
        80: 'light-rain',
        81: 'rain',
        82: 'heavy-rain',
        85: 'light-snow',
        86: 'heavy-snow',
        95: 'thunderstorm',
        96: 'thunderstorm',
        99: 'thunderstorm'
    };
    
    return iconMap[code] || 'unknown';
};

const processWeatherData = (data, locationName, lat, lon, preferredUnit = 'celsius') => {
    // Weather code mapping for readable descriptions
    const weatherCodes = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Fog',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        56: 'Light freezing drizzle',
        57: 'Dense freezing drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        66: 'Light freezing rain',
        67: 'Heavy freezing rain',
        71: 'Slight snow fall',
        73: 'Moderate snow fall',
        75: 'Heavy snow fall',
        77: 'Snow grains',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        85: 'Slight snow showers',
        86: 'Heavy snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with slight hail',
        99: 'Thunderstorm with heavy hail'
    };

    // Process current weather
    const current = {
        location: locationName,
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        temperature: convertTemperature(data.current.temperature_2m, 'celsius', preferredUnit),
        humidity: data.current.relative_humidity_2m,
        windSpeed: Math.round(data.current.wind_speed_10m),
        windDirection: data.current.wind_direction_10m,
        precipitation: data.current.precipitation,
        weatherCode: data.current.weather_code,
        description: weatherCodes[data.current.weather_code] || 'Unknown',
        units: {
            temperature: getUnitSymbol(preferredUnit),
            windSpeed: data.current_units.wind_speed_10m,
            precipitation: data.current_units.precipitation
        }
    };

    // Process hourly forecast (next 24 hours)
    const hourlyForecast = [];
    const now = new Date();
    const currentHour = now.getHours();
    
    // Start from the current hour and get 24 hours of forecast
    for (let i = 0; i < 24; i++) {
        const index = currentHour + i;
        if (index < data.hourly.time.length) {
            const time = new Date(data.hourly.time[index]);
            hourlyForecast.push({
                time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                temperature: convertTemperature(data.hourly.temperature_2m[index], 'celsius', preferredUnit),
                precipitationProbability: data.hourly.precipitation_probability[index],
                weatherCode: data.hourly.weather_code[index],
                description: weatherCodes[data.hourly.weather_code[index]] || 'Unknown'
            });
        }
    }

    // Process daily forecast
    const dailyForecast = data.daily.time.map((time, index) => {
        const date = new Date(time);
        return {
            date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            maxTemp: convertTemperature(data.daily.temperature_2m_max[index], 'celsius', preferredUnit),
            minTemp: convertTemperature(data.daily.temperature_2m_min[index], 'celsius', preferredUnit),
            precipitationSum: data.daily.precipitation_sum[index],
            precipitationProbability: data.daily.precipitation_probability_max[index],
            weatherCode: data.daily.weather_code[index],
            description: weatherCodes[data.daily.weather_code[index]] || 'Unknown'
        };
    });

    return {
        current,
        hourlyForecast,
        dailyForecast,
        units: {
            ...data.daily_units,
            temperature: getUnitSymbol(preferredUnit)
        }
    };
};

const fetchWeatherData = async (coords, preferredUnit = 'celsius') => {
    try {
        const response = await weatherApi.get('/', {
            params: {
                latitude: coords.lat,
                longitude: coords.lon,
                current: [
                    'temperature_2m',
                    'relative_humidity_2m',
                    'precipitation',
                    'weather_code',
                    'wind_speed_10m'
                ].join(','),
                hourly: [
                    'temperature_2m',
                    'weather_code',
                    'precipitation_probability'
                ].join(','),
                forecast_days: 1,
                timezone: 'auto'
            }
        });

        return processWeatherData(response.data, coords.displayName, coords.lat, coords.lon, preferredUnit);
    } catch (error) {
        console.error('Weather API Error:', error);
        throw error;
    }
};

// Controller functions
const index = async (req, res) => {
    try {
    res.render('pages/index', { 
            title: 'Home',
            user: req.user,
        weather: null
    });
    } catch (error) {
        console.error('Home page error:', error);
        res.render('pages/index', {
            title: 'Home',
            user: req.user,
            weather: null,
            error: 'Error loading home page'
        });
    }
};

const getWeather = async (req, res) => {
    try {
        const { city } = req.query;
        
        if (!city) {
            return res.render('pages/index', {
                title: 'Home',
                user: req.user,
                weather: null,
                error: 'Please provide a city name'
            });
        }

        // Get fresh user data with settings
        const user = req.user ? await User.findById(req.user.id) : null;
        
        // Get user's preferred temperature unit if logged in
        const preferredUnit = user?.settings?.temperatureUnit || 'celsius';

        // Step 1: Get coordinates from Nominatim API
        const geocodeResponse = await axios.get(`${process.env.GEOCODE_API_URL}/search`, {
            params: {
                q: city,
                format: 'json',
                limit: 1
            },
            headers: {
                'User-Agent': process.env.APP_USER_AGENT
            },
            timeout: parseInt(process.env.API_TIMEOUT)
        });

        if (!geocodeResponse.data || geocodeResponse.data.length === 0) {
            return res.render('pages/index', {
                title: 'Home',
                user: req.user,
                weather: null,
                error: 'City not found. Please try a different location.'
            });
        }

        const { lat, lon, display_name } = geocodeResponse.data[0];
        const locationData = {
            name: display_name,
            latitude: parseFloat(lat),
            longitude: parseFloat(lon)
        };

        // Check cache first with preferred unit
        let weatherData = await WeatherCache.getOrCreate(locationData, preferredUnit);
        console.log('Cache hit:', !!weatherData);

        if (!weatherData) {
            console.log('Cache miss, fetching from API...'); // Debug log
            // If not in cache, fetch from API
            const weatherResponse = await axios.get(process.env.WEATHER_API_URL, {
                params: {
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    timezone: 'auto',
                    current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,precipitation',
                    hourly: 'temperature_2m,precipitation_probability,weather_code',
                    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max',
                    forecast_days: 7
                },
                timeout: parseInt(process.env.API_TIMEOUT)
            });

            // Process weather data with preferred unit
            weatherData = processWeatherData(weatherResponse.data, display_name, lat, lon, preferredUnit);

            try {
                // Save to cache with temperature unit
                const cacheEntry = await WeatherCache.create({
                    location: locationData,
                    weatherData,
                    temperatureUnit: preferredUnit
                });
                console.log('Cache created:', cacheEntry._id); // Debug log
            } catch (cacheError) {
                console.error('Cache creation error:', cacheError);
            }
        }

        return res.render('pages/index', {
            title: 'Home',
            user: user, // Use the fresh user data
            weather: weatherData,
            searchQuery: city
        });
    } catch (error) {
        console.error('Weather search error:', error);
        
        const errorMessage = error.response?.status === 429 
            ? 'Too many requests. Please try again later.'
            : 'Error fetching weather data. Please try again.';

        return res.render('pages/index', {
            title: 'Home',
            user: req.user,
            weather: null,
            searchQuery: req.query.city,
            error: errorMessage
        });
    }
};

const apiGetWeather = async (req, res) => {
    try {
        const { city } = req.query;
        
        if (!city) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide a city name'
            });
        }

        // Get fresh user data with settings
        const user = req.user ? await User.findById(req.user.id) : null;
        
        // Get user's preferred temperature unit if logged in
        const preferredUnit = user?.settings?.temperatureUnit || 'celsius';

        // Step 1: Get coordinates from Nominatim API
        const geocodeResponse = await axios.get(`${process.env.GEOCODE_API_URL}/search`, {
            params: {
                q: city,
                format: 'json',
                limit: 1
            },
            headers: {
                'User-Agent': process.env.APP_USER_AGENT
            },
            timeout: parseInt(process.env.API_TIMEOUT)
        });

        if (!geocodeResponse.data || geocodeResponse.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'City not found'
            });
        }

        const { lat, lon, display_name } = geocodeResponse.data[0];
        const locationData = {
            name: display_name,
            latitude: parseFloat(lat),
            longitude: parseFloat(lon)
        };

        // Check cache first with preferred unit
        let weatherData = await WeatherCache.getOrCreate(locationData, preferredUnit);

        if (!weatherData) {
            // If not in cache, fetch from API
            const weatherResponse = await axios.get(process.env.WEATHER_API_URL, {
                params: {
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    timezone: 'auto',
                    current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,precipitation',
                    hourly: 'temperature_2m,precipitation_probability,weather_code',
                    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max',
                    forecast_days: 7
                },
                timeout: parseInt(process.env.API_TIMEOUT)
            });

            // Process weather data with preferred unit
            weatherData = processWeatherData(weatherResponse.data, display_name, lat, lon, preferredUnit);

            // Save to cache with temperature unit
            await WeatherCache.create({
                location: locationData,
                weatherData,
                temperatureUnit: preferredUnit
            });
        }

        return res.json({
            success: true,
            data: weatherData
        });
    } catch (error) {
        console.error('API Weather search error:', error);
        
        if (error.response?.status === 429) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Please try again later.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error fetching weather data'
        });
    }
};

module.exports = {
    index,
    getWeather,
    apiGetWeather
};
