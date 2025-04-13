const { body } = require('express-validator');

const registerValidationRules = () => {
  return [
    body('username')
      .trim()
      .isLength({ min: 3 }).withMessage('Username must be at least 3 characters long.')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores.'),
    body('email')
      .isEmail().withMessage('Please provide a valid email address.')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
  ];
};

const loginValidationRules = () => {
  return [
    body('email')
      .isEmail().withMessage('Please provide a valid email address.')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required.'),
  ];
};

module.exports = {
  registerValidationRules,
  loginValidationRules,
}; 