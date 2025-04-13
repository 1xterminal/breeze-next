/**
 * Handles weather-based theme changes for the application
 */
document.addEventListener('DOMContentLoaded', () => {
    // Set initial theme based on weather data if available
    setWeatherBasedBackground();
});

/**
 * Sets the background class based on weather conditions
 * Weather codes from OpenMeteo API:
 * 0: Clear sky
 * 1-3: Mainly clear, partly cloudy, and overcast
 * 45-48: Fog and depositing rime fog
 * 51-57: Drizzle
 * 61-65: Rain
 * 66-67: Freezing rain
 * 71-77: Snow fall
 * 80-82: Rain showers
 * 85-86: Snow showers
 * 95-99: Thunderstorm
 */
function setWeatherBasedBackground() {
    // Remove existing classes
    document.body.classList.remove('weather-clear', 'weather-cloudy', 'weather-night', 'weather-rain', 'weather-snow');
    
    // Get weather code if available (set by controller)
    const weatherCodeElement = document.getElementById('weather-code');
    if (!weatherCodeElement) {
        // Default to time-based if no weather data
        setTimeBasedBackground();
        return;
    }
    
    const weatherCode = parseInt(weatherCodeElement.value);
    
    // Set class based on weather code
    if (weatherCode === 0) {
        // Clear sky
        document.body.classList.add('weather-clear');
    } else if (weatherCode >= 1 && weatherCode <= 3) {
        // Cloudy conditions
        document.body.classList.add('weather-cloudy');
    } else if ((weatherCode >= 51 && weatherCode <= 67) || 
               (weatherCode >= 80 && weatherCode <= 82)) {
        // Rain conditions
        document.body.classList.add('weather-rain');
    } else if ((weatherCode >= 71 && weatherCode <= 77) || 
               (weatherCode >= 85 && weatherCode <= 86)) {
        // Snow conditions
        document.body.classList.add('weather-snow');
    } else if (weatherCode >= 95 && weatherCode <= 99) {
        // Thunderstorm
        document.body.classList.add('weather-night');
    } else {
        // Default to time-based for other weather codes
        setTimeBasedBackground();
    }
}

/**
 * Fallback: Sets the background class based on time of day
 */
function setTimeBasedBackground() {
    const hour = new Date().getHours();
    
    // Night (7pm - 6am)
    if (hour >= 19 || hour < 6) {
        document.body.classList.add('weather-night');
    }
    // Morning/Evening (6am-9am or 4pm-7pm)
    else if ((hour >= 6 && hour < 9) || (hour >= 16 && hour < 19)) {
        document.body.classList.add('weather-cloudy');
    }
    // Day (9am - 4pm)
    else {
        document.body.classList.add('weather-clear');
    }
} 