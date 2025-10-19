const { body, validationResult } = require('express-validator');

// Validation rules cho tạo category mới
const validateCreateCategory = [
  body('name')
    .notEmpty()
    .withMessage('Tên danh mục là bắt buộc')
    .isLength({ min: 2, max: 100 })
    .withMessage('Tên danh mục phải có từ 2-100 ký tự')
    .trim()
    .matches(/^[a-zA-ZÀ-ỹ0-9\s\-_&().]+$/)
    .withMessage('Tên danh mục chỉ được chứa chữ cái, số và các ký tự đặc biệt: - _ & ( ) .')
];

// Validation rules cho cập nhật category
const validateUpdateCategory = [
  body('name')
    .notEmpty()
    .withMessage('Tên danh mục là bắt buộc')
    .isLength({ min: 2, max: 100 })
    .withMessage('Tên danh mục phải có từ 2-100 ký tự')
    .trim()
    .matches(/^[a-zA-ZÀ-ỹ0-9\s\-_&().]+$/)
    .withMessage('Tên danh mục chỉ được chứa chữ cái, số và các ký tự đặc biệt: - _ & ( ) .')
];

// Validation cho query parameters
const validateCategoryQuery = [
  body('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Trang phải là số nguyên dương'),
  
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Giới hạn phải là số nguyên từ 1-100'),
  
  body('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Từ khóa tìm kiếm phải có từ 1-100 ký tự')
    .trim()
];

// Validation cho UUID parameter
const validateUUIDParam = [
  body('id')
    .custom((value, { req }) => {
      const id = req.params.id;
      if (!id) {
        throw new Error('ID là bắt buộc');
      }
      
      // Simple UUID validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        throw new Error('ID phải là UUID hợp lệ');
      }
      
      return true;
    })
];

// Middleware xử lý validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dữ liệu không hợp lệ',
      details: errors.array()
    });
  }
  next();
};

module.exports = {
  validateCreateCategory,
  validateUpdateCategory,
  validateCategoryQuery,
  validateUUIDParam,
  handleValidationErrors
};