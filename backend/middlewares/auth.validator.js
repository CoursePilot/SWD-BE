const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const loginValidation = [
  body('email')
    .isEmail().withMessage('Please enter a valid email address')
    .notEmpty().withMessage('Email is required')
    .isLength({ max: 255 }).withMessage('Email must be at most 255 characters')
    .custom((val) => val === val.toLowerCase()).withMessage('Email must be lowercase')
    .custom((val) => !/\s/.test(val)).withMessage('Email must not contain whitespace'),
  body('password')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]).{8,128}$/)
    .withMessage('Password must contain uppercase, lowercase, number and special character')
    .custom((val) => !/\s/.test(val)).withMessage('Password must not contain whitespace')
    .notEmpty().withMessage('Password is required'),
  validate
];

const registerValidation = [
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]).{8,128}$/)
    .withMessage('Password must contain uppercase, lowercase, number and special character')
    .custom((val) => !/\s/.test(val)).withMessage('Password must not contain whitespace'),
  body('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters')
    .custom((val) => val.trim() === val).withMessage('Name must not have leading/trailing spaces'),
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .isLength({ max: 255 }).withMessage('Email must be at most 255 characters')
    .custom((val) => val === val.toLowerCase()).withMessage('Email must be lowercase')
    .custom((val) => !/\s/.test(val)).withMessage('Email must not contain whitespace'),
  body('phone')
    .optional()
    .matches(/^\d{10,15}$/).withMessage('Phone must be 10-15 digits'),
  validate
];

const requestOtpValidation = [
  body('email')
    .isEmail().withMessage('Please enter a valid email address')
    .notEmpty().withMessage('Email is required'),
  validate
];

const verifyOtpValidation = [
  body('email')
    .isEmail().withMessage('Please enter a valid email address')
    .notEmpty().withMessage('Email is required'),
  body('code')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits')
    .isNumeric().withMessage('OTP must be numeric'),
  validate
];

const updateProfileValidation = [
  body('name')
    .optional({ checkFalsy: true })
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters')
    .custom((val) => !val || val.trim() === val).withMessage('Name must not have leading/trailing spaces'),
  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^\d{10,15}$/).withMessage('Phone must be 10-15 digits'),
  body('avatarUrl')
    .optional({ checkFalsy: true })
    .isURL().withMessage('Avatar URL must be a valid URL'),
  validate
];

module.exports = {
  loginValidation,
  registerValidation,
  requestOtpValidation,
  verifyOtpValidation,
  updateProfileValidation,
};


