/**
 * Convert temperature between different units
 */
const convertTemperature = (value, fromUnit = 'celsius', toUnit = 'celsius') => {
    // If units are the same, return original value
    if (fromUnit === toUnit) return value;

    // Convert to celsius first if not already
    let celsius = value;
    if (fromUnit === 'fahrenheit') {
        celsius = (value - 32) * (5/9);
    } else if (fromUnit === 'kelvin') {
        celsius = value - 273.15;
    }

    // Convert from celsius to target unit
    switch (toUnit) {
        case 'fahrenheit':
            return Math.round((celsius * 9/5) + 32);
        case 'kelvin':
            return Math.round(celsius + 273.15);
        default:
            return Math.round(celsius);
    }
};

/**
 * Get temperature unit symbol
 */
const getUnitSymbol = (unit) => {
    switch (unit) {
        case 'fahrenheit':
            return '°F';
        case 'kelvin':
            return 'K';
        default:
            return '°C';
    }
};

module.exports = {
    convertTemperature,
    getUnitSymbol
}; 