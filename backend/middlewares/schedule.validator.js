const { body, validationResult } = require('express-validator');

// Validation rules cho tạo schedule mới
const validateCreateSchedule = [
  body('courseId')
    .notEmpty()
    .withMessage('ID khóa học là bắt buộc')
    .isUUID()
    .withMessage('ID khóa học phải là UUID hợp lệ'),
  
  body('startDate')
    .notEmpty()
    .withMessage('Ngày bắt đầu là bắt buộc')
    .isDate()
    .withMessage('Ngày bắt đầu phải là định dạng ngày hợp lệ (YYYY-MM-DD)')
    .custom((value) => {
      const startDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (startDate < today) {
        throw new Error('Ngày bắt đầu không thể là ngày trong quá khứ');
      }
      return true;
    }),
  
  body('endDate')
    .notEmpty()
    .withMessage('Ngày kết thúc là bắt buộc')
    .isDate()
    .withMessage('Ngày kết thúc phải là định dạng ngày hợp lệ (YYYY-MM-DD)')
    .custom((value, { req }) => {
      const startDate = new Date(req.body.startDate);
      const endDate = new Date(value);
      
      if (endDate <= startDate) {
        throw new Error('Ngày kết thúc phải sau ngày bắt đầu');
      }
      return true;
    }),
  
  body('seats')
    .notEmpty()
    .withMessage('Số chỗ ngồi là bắt buộc')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Số chỗ ngồi phải là số nguyên từ 1 đến 1000'),
  
  body('location')
    .notEmpty()
    .withMessage('Địa điểm là bắt buộc')
    .isLength({ min: 5, max: 255 })
    .withMessage('Địa điểm phải có từ 5-255 ký tự')
    .trim(),
  
  body('status')
    .optional()
    .isIn(['open', 'full', 'cancelled'])
    .withMessage('Trạng thái phải là: open, full, hoặc cancelled')
];

// Validation rules cho cập nhật schedule
const validateUpdateSchedule = [
  body('courseId')
    .optional()
    .isUUID()
    .withMessage('ID khóa học phải là UUID hợp lệ'),
  
  body('startDate')
    .optional()
    .isDate()
    .withMessage('Ngày bắt đầu phải là định dạng ngày hợp lệ (YYYY-MM-DD)')
    .custom((value) => {
      if (value) {
        const startDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (startDate < today) {
          throw new Error('Ngày bắt đầu không thể là ngày trong quá khứ');
        }
      }
      return true;
    }),
  
  body('endDate')
    .optional()
    .isDate()
    .withMessage('Ngày kết thúc phải là định dạng ngày hợp lệ (YYYY-MM-DD)')
    .custom((value, { req }) => {
      if (value && req.body.startDate) {
        const startDate = new Date(req.body.startDate);
        const endDate = new Date(value);
        
        if (endDate <= startDate) {
          throw new Error('Ngày kết thúc phải sau ngày bắt đầu');
        }
      }
      return true;
    }),
  
  body('seats')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Số chỗ ngồi phải là số nguyên từ 1 đến 1000'),
  
  body('location')
    .optional()
    .isLength({ min: 5, max: 255 })
    .withMessage('Địa điểm phải có từ 5-255 ký tự')
    .trim(),
  
  body('status')
    .optional()
    .isIn(['open', 'full', 'cancelled'])
    .withMessage('Trạng thái phải là: open, full, hoặc cancelled'),
  
  // Custom validation để đảm bảo ít nhất một trường được cập nhật
  body().custom((value, { req }) => {
    const allowedFields = ['courseId', 'startDate', 'endDate', 'seats', 'location', 'status'];
    const providedFields = Object.keys(req.body).filter(key => allowedFields.includes(key));
    
    if (providedFields.length === 0) {
      throw new Error('Ít nhất một trường cần được cập nhật');
    }
    return true;
  })
];

// Validation cho query parameters
const validateScheduleQuery = [
  body('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Trang phải là số nguyên lớn hơn 0'),
  
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Giới hạn phải là số nguyên từ 1 đến 100'),
  
  body('courseId')
    .optional()
    .isUUID()
    .withMessage('ID khóa học phải là UUID hợp lệ'),
  
  body('status')
    .optional()
    .isIn(['open', 'full', 'cancelled'])
    .withMessage('Trạng thái phải là: open, full, hoặc cancelled'),
  
  body('startDate')
    .optional()
    .isDate()
    .withMessage('Ngày bắt đầu phải là định dạng ngày hợp lệ (YYYY-MM-DD)'),
  
  body('endDate')
    .optional()
    .isDate()
    .withMessage('Ngày kết thúc phải là định dạng ngày hợp lệ (YYYY-MM-DD)')
];

// Middleware xử lý lỗi validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Dữ liệu không hợp lệ",
      details: errors.array()
    });
  }
  next();
};

module.exports = {
  validateCreateSchedule,
  validateUpdateSchedule,
  validateScheduleQuery,
  handleValidationErrors
};