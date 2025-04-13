const mongoose = require('mongoose');
const { convertTemperature } = require('../utils/temperatureConverter');

const WeatherCacheSchema = new mongoose.Schema({
  location: {
    name: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  weatherData: {
    current: {
      location: String,
      latitude: Number,
      longitude: Number,
      temperature: Number,
      humidity: Number,
      windSpeed: Number,
      windDirection: Number,
      precipitation: Number,
      weatherCode: Number,
      description: String,
      units: {
        temperature: String,
        windSpeed: String,
        precipitation: String
      }
    },
    hourlyForecast: [{
      time: String,
      temperature: Number,
      precipitationProbability: Number,
      weatherCode: Number,
      description: String
    }],
    dailyForecast: [{
      date: String,
      maxTemp: Number,
      minTemp: Number,
      precipitationSum: Number,
      precipitationProbability: Number,
      weatherCode: Number,
      description: String
    }],
    units: mongoose.Schema.Types.Mixed
  },
  temperatureUnit: {
    type: String,
    enum: ['celsius', 'fahrenheit', 'kelvin'],
    default: 'celsius'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 1800 // TTL of 30 minutes (in seconds)
  }
});

// Compound index for faster lookups
WeatherCacheSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

// Static method to get or create cache
WeatherCacheSchema.statics.getOrCreate = async function(locationData, preferredUnit = 'celsius') {
  try {
    const { name, latitude, longitude } = locationData;
    
    // Convert coordinates to numbers and fix precision
    const lat = Number(parseFloat(latitude).toFixed(4));
    const lon = Number(parseFloat(longitude).toFixed(4));
    
    // Look for existing cache within acceptable range (0.01 degrees ≈ 1km)
    const existingCache = await this.findOne({
      $and: [
        { 'location.latitude': { $gte: lat - 0.01, $lte: lat + 0.01 } },
        { 'location.longitude': { $gte: lon - 0.01, $lte: lon + 0.01 } }
      ]
    }).sort({ createdAt: -1 });

    if (existingCache) {
      // Check if cache is still fresh (less than 30 minutes old)
      const cacheAge = Date.now() - existingCache.createdAt;
      if (cacheAge < 1800000) { // 30 minutes in milliseconds
        console.log('Cache found:', existingCache._id);
        
        // Convert temperatures if needed
        if (existingCache.temperatureUnit !== preferredUnit) {
          const weatherData = existingCache.weatherData;
          
          // Convert current temperature
          weatherData.current.temperature = convertTemperature(
            weatherData.current.temperature,
            existingCache.temperatureUnit,
            preferredUnit
          );
          
          // Convert hourly temperatures
          weatherData.hourlyForecast.forEach(hour => {
            hour.temperature = convertTemperature(
              hour.temperature,
              existingCache.temperatureUnit,
              preferredUnit
            );
          });
          
          // Convert daily temperatures
          weatherData.dailyForecast.forEach(day => {
            day.maxTemp = convertTemperature(
              day.maxTemp,
              existingCache.temperatureUnit,
              preferredUnit
            );
            day.minTemp = convertTemperature(
              day.minTemp,
              existingCache.temperatureUnit,
              preferredUnit
            );
          });
          
          weatherData.units.temperature = preferredUnit;
        }
        
        return existingCache.weatherData;
      }
      // If cache is stale, delete it
      console.log('Cache stale, deleting:', existingCache._id);
      await existingCache.deleteOne();
    }

    return null;
  } catch (error) {
    console.error('WeatherCache getOrCreate error:', error);
    return null; // Return null on error to trigger a fresh API call
  }
};

module.exports = mongoose.model('WeatherCache', WeatherCacheSchema);