const axios = require('axios');
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

const processWeatherData = (data, locationName) => {
    const current = {
        location: locationName,
        temperature: data.current.temperature_2m,
        humidity: data.current.relative_humidity_2m,
        windSpeed: data.current.wind_speed_10m,
        precipitation: data.current.precipitation,
        weatherCode: data.current.weather_code,
        description: getWeatherDescription(data.current.weather_code),
        icon: getWeatherIcon(data.current.weather_code)
    };

    const forecast = data.hourly.time
        .slice(1, 6)
        .map((time, index) => ({
            time: new Date(time).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }),
            temperature: data.hourly.temperature_2m[index + 1],
            precipitationProbability: data.hourly.precipitation_probability[index + 1],
            weatherCode: data.hourly.weather_code[index + 1],
            description: getWeatherDescription(data.hourly.weather_code[index + 1]),
            icon: getWeatherIcon(data.hourly.weather_code[index + 1])
        }));

    return { current, forecast };
};

const fetchWeatherData = async (coords) => {
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

        return processWeatherData(response.data, coords.displayName);
    } catch (error) {
        console.error('Weather API Error:', error);
        throw error;
    }
};

// Controller functions
const index = (req, res) => {
    res.render('pages/index', { 
        title: 'Weather App - Home',
        weather: null
    });
};

const getWeather = async (req, res) => {
    try {
        const { city } = req.query;
        if (!city) {
            return res.render('pages/index', {
                title: 'Weather App - Home',
                weather: null
            });
        }

        const coords = await getCoordinates(city);
        const weatherData = await fetchWeatherData(coords);

        return res.render('pages/index', {
            title: `Weather - ${coords.displayName}`,
            weather: weatherData
        });

    } catch (error) {
        console.error('Weather Service Error:', error);
        
        if (error.response?.status === 404) {
            req.flash('error', 'City not found');
        } else {
            req.flash('error', 'Unable to fetch weather data. Please try again.');
        }

        return res.render('pages/index', {
            title: 'Weather App - Home',
            weather: null,
            error: 'Unable to fetch weather data'
        });
    }
};

const apiGetWeather = async (req, res) => {
    try {
        const { city } = req.query;
        if (!city) {
            return res.status(400).json({ 
                success: false, 
                message: 'City parameter is required' 
            });
        }

        const coords = await getCoordinates(city);
        const weatherData = await fetchWeatherData(coords);

        return res.json({
            success: true,
            data: weatherData
        });

    } catch (error) {
        console.error('Weather API Error:', error);
        
        if (error.response?.status === 404) {
            return res.status(404).json({
                success: false,
                message: 'City not found'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Unable to fetch weather data'
        });
    }
};

module.exports = {
    index,
    getWeather,
    apiGetWeather
};
