const { convertTemperature, formatTemperature, getUnitSymbol } = require('../utils/temperatureConverter');

/**
 * Middleware to add temperature conversion utilities to res.locals
 * This makes them available in all views
 */
const temperatureMiddleware = (req, res, next) => {
    // Add temperature conversion utilities to locals
    res.locals.convertTemperature = convertTemperature;
    res.locals.formatTemperature = formatTemperature;
    res.locals.getUnitSymbol = getUnitSymbol;

    // Add helper function to convert and format temperature in one step
    res.locals.displayTemperature = (value, fromUnit = 'celsius', toUnit = null) => {
        const targetUnit = toUnit || res.locals.user?.settings?.temperatureUnit || 'celsius';
        const convertedTemp = convertTemperature(value, fromUnit, targetUnit);
        return formatTemperature(convertedTemp, targetUnit);
    };

    next();
};

module.exports = temperatureMiddleware; 