/**
 * Convert temperature between different units
 * @param {number} value - Temperature value to convert
 * @param {string} fromUnit - Unit to convert from ('celsius', 'fahrenheit', or 'kelvin')
 * @param {string} toUnit - Unit to convert to ('celsius', 'fahrenheit', or 'kelvin')
 * @returns {number} - Converted temperature value
 */
const convertTemperature = (value, fromUnit = 'celsius', toUnit = 'celsius') => {
    // If units are the same, return original value
    if (fromUnit === toUnit) {
        return value;
    }

    // First convert to Celsius as intermediate step if needed
    let celsius = value;
    if (fromUnit === 'fahrenheit') {
        celsius = (value - 32) * 5/9;
    } else if (fromUnit === 'kelvin') {
        celsius = value - 273.15;
    }

    // Then convert from Celsius to target unit
    switch (toUnit) {
        case 'fahrenheit':
            return (celsius * 9/5) + 32;
        case 'kelvin':
            return celsius + 273.15;
        case 'celsius':
        default:
            return celsius;
    }
};

/**
 * Get the symbol for a temperature unit
 * @param {string} unit - Temperature unit ('celsius', 'fahrenheit', or 'kelvin')
 * @returns {string} - Unit symbol (°C, °F, or K)
 */
const getUnitSymbol = (unit) => {
    switch (unit.toLowerCase()) {
        case 'fahrenheit':
            return '°F';
        case 'kelvin':
            return 'K';
        case 'celsius':
        default:
            return '°C';
    }
};

/**
 * Format temperature with proper unit symbol
 * @param {number} value - Temperature value
 * @param {string} unit - Temperature unit
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} - Formatted temperature with unit symbol
 */
const formatTemperature = (value, unit, decimals = 1) => {
    const roundedValue = Number(value).toFixed(decimals);
    return `${roundedValue}${getUnitSymbol(unit)}`;
};

module.exports = {
    convertTemperature,
    getUnitSymbol,
    formatTemperature
}; 