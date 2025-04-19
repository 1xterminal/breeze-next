const mongoose = require('mongoose');

const SearchHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    name: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  searchedAt: {
    type: Date,
    default: Date.now
  },
  weatherSnapshot: {
    current: {
      temperature: Number,
      description: String,
      humidity: Number,
      windSpeed: Number,
      windDirection: Number,
      precipitation: Number,
      weatherCode: Number,
      temperatureUnit: { type: String, default: 'celsius' }
    },
    hourly: [{
      time: String,
      temperature: Number,
      precipitationProbability: Number,
      weatherCode: Number,
      description: String,
      temperatureUnit: { type: String, default: 'celsius' }
    }],
    daily: [{
      date: String,
      maxTemp: Number,
      minTemp: Number,
      precipitationSum: Number,
      precipitationProbability: Number,
      weatherCode: Number,
      description: String,
      temperatureUnit: { type: String, default: 'celsius' }
    }]
  }
}, {
  timestamps: true
});

// Index for faster user-specific queries
SearchHistorySchema.index({ userId: 1, searchedAt: -1 });

// Static method to add search to history with full weather data
SearchHistorySchema.statics.addSearch = async function(userId, locationData, weatherData) {
  const search = new this({
    userId,
    location: {
      name: locationData.name,
      latitude: locationData.latitude,
      longitude: locationData.longitude
    },
    weatherSnapshot: {
      current: {
        temperature: weatherData.current.temperature,
        description: weatherData.current.description,
        humidity: weatherData.current.humidity,
        windSpeed: weatherData.current.windSpeed,
        windDirection: weatherData.current.windDirection,
        precipitation: weatherData.current.precipitation,
        weatherCode: weatherData.current.weatherCode,
        temperatureUnit: weatherData.current.originalUnit || 'celsius'
      },
      hourly: weatherData.hourlyForecast.map(hour => ({
        time: hour.time,
        temperature: hour.temperature,
        precipitationProbability: hour.precipitationProbability,
        weatherCode: hour.weatherCode,
        description: hour.description,
        temperatureUnit: hour.originalUnit || 'celsius'
      })),
      daily: weatherData.dailyForecast.map(day => ({
        date: day.date,
        maxTemp: day.maxTemp,
        minTemp: day.minTemp,
        precipitationSum: day.precipitationSum,
        precipitationProbability: day.precipitationProbability,
        weatherCode: day.weatherCode,
        description: day.description,
        temperatureUnit: day.originalUnit || 'celsius'
      }))
    }
  });

  await search.save();
  return search;
};

// Static method to get user's search history
SearchHistorySchema.statics.getUserHistory = async function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ searchedAt: -1 })
    .limit(limit)
    .lean();
};

module.exports = mongoose.model('SearchHistory', SearchHistorySchema); 