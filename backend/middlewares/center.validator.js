const { body, validationResult } = require('express-validator');

// Validation rules cho center request form
const validateCenterRequest = [
  body('name')
    .notEmpty()
    .withMessage('Tên trung tâm là bắt buộc')
    .isLength({ min: 2, max: 100 })
    .withMessage('Tên trung tâm phải có từ 2-100 ký tự')
    .trim(),
  
  body('phone')
    .notEmpty()
    .withMessage('Số điện thoại là bắt buộc')
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('Số điện thoại không hợp lệ')
    .isLength({ min: 10, max: 15 })
    .withMessage('Số điện thoại phải có từ 10-15 ký tự'),
  
  body('address')
    .notEmpty()
    .withMessage('Địa chỉ là bắt buộc')
    .isLength({ min: 10, max: 200 })
    .withMessage('Địa chỉ phải có từ 10-200 ký tự')
    .trim(),
  
  body('websiteUrl')
    .optional()
    .isURL()
    .withMessage('URL website không hợp lệ')
    .trim(),
  
  body('description')
    .notEmpty()
    .withMessage('Mô tả trung tâm là bắt buộc')
    .isLength({ min: 20, max: 1000 })
    .withMessage('Mô tả phải có từ 20-1000 ký tự')
    .trim(),
  
  body('logoUrl')
    .optional()
    .isURL()
    .withMessage('URL logo không hợp lệ')
    .trim(),
  
  body('documents')
    .optional()
    .isString()
    .withMessage('Documents phải là chuỗi JSON')
    .custom((value) => {
      if (value) {
        try {
          JSON.parse(value);
          return true;
        } catch (e) {
          throw new Error('Documents phải là JSON hợp lệ');
        }
      }
      return true;
    }),
];

// Validation rules cho center update form
const validateCenterUpdate = [
  body('name')
    .optional({ checkFalsy: true, nullable: true })
    .isLength({ min: 2, max: 100 })
    .withMessage('Tên trung tâm phải có từ 2-100 ký tự')
    .trim(),
  
  body('phone')
    .optional({ checkFalsy: true, nullable: true })
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('Số điện thoại không hợp lệ')
    .isLength({ min: 10, max: 15 })
    .withMessage('Số điện thoại phải có từ 10-15 ký tự'),
  
  body('address')
    .optional({ checkFalsy: true, nullable: true })
    .isLength({ min: 10, max: 200 })
    .withMessage('Địa chỉ phải có từ 10-200 ký tự')
    .trim(),
  
  body('websiteUrl')
    .optional({ checkFalsy: true, nullable: true })
    .isURL()
    .withMessage('URL website không hợp lệ')
    .trim(),
  
  body('description')
    .optional({ checkFalsy: true, nullable: true })
    .isLength({ min: 20, max: 1000 })
    .withMessage('Mô tả phải có từ 20-1000 ký tự')
    .trim(),
  
  body('logoUrl')
    .optional({ checkFalsy: true, nullable: true })
    .isURL()
    .withMessage('URL logo không hợp lệ')
    .trim(),
];

// Validation rules cho admin approval/rejection
const validateAdminAction = [
  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Status phải là approved hoặc rejected'),
  
  body('adminNotes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Ghi chú admin không được quá 500 ký tự')
    .trim(),
];

// Middleware để xử lý validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

module.exports = {
  validateCenterRequest,
  validateCenterUpdate,
  validateAdminAction,
  handleValidationErrors,
};
