const mongoose = require('mongoose');

const WeatherCacheSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  dataType: {
    type: String,
    required: true,
    enum: ['current', 'hourly_forecast', 'daily_forecast', 'historical'], // Add other types as needed
    index: true,
  },
  weatherData: {
    type: mongoose.Schema.Types.Mixed, // Store the raw JSON response from Open-Meteo
    required: true,
  },
  fetchedAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: '1m' } // Automatically remove documents after they expire (e.g., 1 minute after expiresAt time)
                               // Adjust the TTL (Time To Live) index duration as needed (e.g., '1h' for 1 hour)
  },
});

// Compound index for efficient lookups based on location and data type
WeatherCacheSchema.index({ latitude: 1, longitude: 1, dataType: 1 });

module.exports = mongoose.model('WeatherCache', WeatherCacheSchema);