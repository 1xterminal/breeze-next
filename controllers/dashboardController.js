const axios = require('axios');
const WeatherCache = require('../models/WeatherCache');
const SearchHistory = require('../models/SearchHistory');
const User = require('../models/User');
const { convertTemperature, getUnitSymbol } = require('../utils/temperatureConverter');

/**
 * Get dashboard page
 * @route GET /dashboard
 * @access Private
 */
const getDashboard = async (req, res) => {
  try {
    // Get user's recent searches
    const recentSearches = await SearchHistory.getUserHistory(req.user.id, 5);
    
    // Get fresh user data with settings
    const user = await User.findById(req.user.id);

    return res.render('pages/dashboard/index', {
      title: 'Weather Dashboard',
      user: user,
      weather: null,
      error: null,
      recentSearches,
      layout: 'layouts/main'
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.render('pages/dashboard/index', {
      title: 'Weather Dashboard',
      user: req.user,
      weather: null,
      error: 'Error loading dashboard',
      recentSearches: [],
      layout: 'layouts/main'
    });
  }
};

/**
 * Search for weather by city name
 * @route GET /dashboard/search
 * @access Private
 */
const searchWeather = async (req, res) => {
  try {
    const { city } = req.query;
    
    if (!city) {
      return res.render('pages/dashboard/index', {
        title: 'Weather Dashboard',
        user: req.user,
        weather: null,
        error: 'Please provide a city name',
        layout: 'layouts/main'
      });
    }

    // Get user's preferred temperature unit
    const user = await User.findById(req.user.id).select('settings');
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
      return res.render('pages/dashboard/index', {
        title: 'Weather Dashboard',
        user: req.user,
        weather: null,
        error: 'City not found. Please try a different location.',
        layout: 'layouts/main'
      });
    }

    const { lat, lon, display_name } = geocodeResponse.data[0];
    console.log('Geocode Response:', { lat, lon, display_name });
    
    const locationData = {
      name: display_name,
      latitude: parseFloat(lat),
      longitude: parseFloat(lon)
    };
    console.log('Location Data:', locationData);

    // Check cache first with preferred unit
    let weatherData = await WeatherCache.getOrCreate(locationData, preferredUnit);

    if (!weatherData) {
      // If not in cache, fetch from API
      const weatherResponse = await axios.get(process.env.WEATHER_API_URL, {
        params: {
          latitude: lat,
          longitude: lon,
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

      // Save to cache with the temperature unit
      await WeatherCache.create({
        location: locationData,
        weatherData,
        temperatureUnit: preferredUnit
      });
    }

    // Save to search history
    await SearchHistory.addSearch(req.user.id, locationData, weatherData);

    // Get recent searches for display
    const recentSearches = await SearchHistory.getUserHistory(req.user.id, 5);

    // Get fresh user data for the view
    const updatedUser = await User.findById(req.user.id);

    console.log('Rendering dashboard with weather data:', {
      location: weatherData.current.location,
      temperature: weatherData.current.temperature,
      unit: weatherData.units.temperature,
      preferredUnit
    });

    return res.render('pages/dashboard/index', {
      title: 'Weather Dashboard',
      user: updatedUser,
      weather: weatherData,
      searchQuery: city,
      recentSearches,
      error: null,
      layout: 'layouts/main'
    });
  } catch (error) {
    console.error('Weather search error:', error);
    
    const errorMessage = error.response?.status === 429 
      ? 'Too many requests. Please try again later.'
      : 'Error fetching weather data. Please try again.';
    
    return res.render('pages/dashboard/index', {
      title: 'Weather Dashboard',
      user: req.user,
      weather: null,
      searchQuery: req.query.city,
      recentSearches: [],
      error: errorMessage,
      layout: 'layouts/main'
    });
  }
};

/**
 * Process the raw weather data from OpenMeteo API
 * @param {Object} data - The raw API response
 * @param {String} locationName - The display name of the location
 * @param {Number} lat - The latitude of the location
 * @param {Number} lon - The longitude of the location
 * @param {String} preferredUnit - User's preferred temperature unit
 * @returns {Object} - Processed weather data
 */
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
    originalUnit: 'celsius', // OpenMeteo always returns Celsius
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
        description: weatherCodes[data.hourly.weather_code[index]] || 'Unknown',
        originalUnit: 'celsius'
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
      description: weatherCodes[data.daily.weather_code[index]] || 'Unknown',
      originalUnit: 'celsius'
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

module.exports = {
  getDashboard,
  searchWeather
};
