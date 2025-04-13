const axios = require('axios');

/**
 * Get dashboard page
 * @route GET /dashboard
 * @access Private
 */
const getDashboard = async (req, res) => {
  try {
    return res.render('pages/dashboard/index', {
      title: 'Weather Dashboard',
      user: req.user,
      weather: null,
      error: null,
      layout: 'layouts/main'
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.render('pages/dashboard/index', {
      title: 'Weather Dashboard',
      user: req.user,
      weather: null,
      error: 'Error loading dashboard',
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

    // Step 2: Get weather forecast from OpenMeteo API
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

    // Process weather data
    const weatherData = processWeatherData(weatherResponse.data, display_name);

    // Save search to history if user is logged in
    if (req.user) {
      // This would be implemented in a future version to save search history
      // await saveSearchToHistory(req.user.id, city, lat, lon);
    }

    return res.render('pages/dashboard/index', {
      title: 'Weather Dashboard',
      user: req.user,
      weather: weatherData,
      searchQuery: city,
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
      error: errorMessage,
      layout: 'layouts/main'
    });
  }
};

/**
 * Process the raw weather data from OpenMeteo API
 * @param {Object} data - The raw API response
 * @param {String} locationName - The display name of the location
 * @returns {Object} - Processed weather data
 */
const processWeatherData = (data, locationName) => {
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
    temperature: Math.round(data.current.temperature_2m),
    humidity: data.current.relative_humidity_2m,
    windSpeed: Math.round(data.current.wind_speed_10m),
    windDirection: data.current.wind_direction_10m,
    precipitation: data.current.precipitation,
    weatherCode: data.current.weather_code,
    description: weatherCodes[data.current.weather_code] || 'Unknown',
    units: {
      temperature: data.current_units.temperature_2m,
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
        temperature: Math.round(data.hourly.temperature_2m[index]),
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
      maxTemp: Math.round(data.daily.temperature_2m_max[index]),
      minTemp: Math.round(data.daily.temperature_2m_min[index]),
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
    units: data.daily_units
  };
};

module.exports = {
  getDashboard,
  searchWeather
};
