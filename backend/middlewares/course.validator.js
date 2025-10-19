const { body, validationResult } = require('express-validator');

// Validation rules cho tạo course mới
const validateCreateCourse = [
  body('centerId')
    .notEmpty()
    .withMessage('ID trung tâm là bắt buộc')
    .isUUID()
    .withMessage('ID trung tâm phải là UUID hợp lệ'),
  
  body('categoryId')
    .notEmpty()
    .withMessage('ID danh mục là bắt buộc')
    .isUUID()
    .withMessage('ID danh mục phải là UUID hợp lệ'),
  
  body('title')
    .notEmpty()
    .withMessage('Tiêu đề khóa học là bắt buộc')
    .isLength({ min: 5, max: 200 })
    .withMessage('Tiêu đề phải có từ 5-200 ký tự')
    .trim(),
  
  body('summary')
    .notEmpty()
    .withMessage('Tóm tắt khóa học là bắt buộc')
    .isLength({ min: 20, max: 500 })
    .withMessage('Tóm tắt phải có từ 20-500 ký tự')
    .trim(),
  
  body('content')
    .notEmpty()
    .withMessage('Nội dung khóa học là bắt buộc')
    .isLength({ min: 50, max: 10000 })
    .withMessage('Nội dung phải có từ 50-10000 ký tự')
    .trim(),
  
  body('priceMin')
    .notEmpty()
    .withMessage('Giá tối thiểu là bắt buộc')
    .isFloat({ min: 0 })
    .withMessage('Giá tối thiểu phải là số không âm'),
  
  body('priceMax')
    .notEmpty()
    .withMessage('Giá tối đa là bắt buộc')
    .isFloat({ min: 0 })
    .withMessage('Giá tối đa phải là số không âm')
    .custom((value, { req }) => {
      if (parseFloat(value) < parseFloat(req.body.priceMin)) {
        throw new Error('Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu');
      }
      return true;
    }),
  
  body('modality')
    .notEmpty()
    .withMessage('Hình thức học là bắt buộc')
    .isIn(['online', 'offline', 'blended'])
    .withMessage('Hình thức học phải là: online, offline, hoặc blended'),
  
  body('status')
    .optional()
    .isIn(['draft', 'submitted', 'approved', 'rejected'])
    .withMessage('Trạng thái phải là: draft, submitted, approved, hoặc rejected')
];

// Validation rules cho cập nhật course
const validateUpdateCourse = [
  body('centerId')
    .optional()
    .isUUID()
    .withMessage('ID trung tâm phải là UUID hợp lệ'),
  
  body('categoryId')
    .optional()
    .isUUID()
    .withMessage('ID danh mục phải là UUID hợp lệ'),
  
  body('title')
    .optional()
    .isLength({ min: 5, max: 200 })
    .withMessage('Tiêu đề phải có từ 5-200 ký tự')
    .trim(),
  
  body('summary')
    .optional()
    .isLength({ min: 20, max: 500 })
    .withMessage('Tóm tắt phải có từ 20-500 ký tự')
    .trim(),
  
  body('content')
    .optional()
    .isLength({ min: 50, max: 10000 })
    .withMessage('Nội dung phải có từ 50-10000 ký tự')
    .trim(),
  
  body('priceMin')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Giá tối thiểu phải là số không âm'),
  
  body('priceMax')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Giá tối đa phải là số không âm')
    .custom((value, { req }) => {
      if (value && req.body.priceMin && parseFloat(value) < parseFloat(req.body.priceMin)) {
        throw new Error('Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu');
      }
      return true;
    }),
  
  body('modality')
    .optional()
    .isIn(['online', 'offline', 'blended'])
    .withMessage('Hình thức học phải là: online, offline, hoặc blended'),
  
  body('status')
    .optional()
    .isIn(['draft', 'submitted', 'approved', 'rejected'])
    .withMessage('Trạng thái phải là: draft, submitted, approved, hoặc rejected'),
  
  // Custom validation để đảm bảo ít nhất một trường được cập nhật
  body().custom((value, { req }) => {
    const allowedFields = ['centerId', 'categoryId', 'title', 'summary', 'content', 'priceMin', 'priceMax', 'modality', 'status'];
    const providedFields = Object.keys(req.body).filter(key => allowedFields.includes(key));
    
    if (providedFields.length === 0) {
      throw new Error('Ít nhất một trường cần được cập nhật');
    }
    return true;
  })
];

// Validation cho query parameters
const validateCourseQuery = [
  // Pagination
  body('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Trang phải là số nguyên dương'),
  
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Giới hạn phải là số nguyên từ 1-100'),
  
  // Filters
  body('centerId')
    .optional()
    .isUUID()
    .withMessage('ID trung tâm phải là UUID hợp lệ'),
  
  body('categoryId')
    .optional()
    .isUUID()
    .withMessage('ID danh mục phải là UUID hợp lệ'),
  
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Trạng thái phải là: draft, published, hoặc archived'),
  
  body('modality')
    .optional()
    .isIn(['online', 'offline', 'hybrid'])
    .withMessage('Hình thức học phải là: online, offline, hoặc hybrid'),
  
  body('search')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Từ khóa tìm kiếm phải có từ 2-100 ký tự')
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
  validateCreateCourse,
  validateUpdateCourse,
  validateCourseQuery,
  validateUUIDParam,
  handleValidationErrors
};