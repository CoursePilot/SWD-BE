const { body, param, query, validationResult } = require('express-validator');

// Validation rules cho follow/unfollow course
const validateFollowCourse = [
  body('userId')
    .notEmpty()
    .withMessage('ID người dùng là bắt buộc')
    .isUUID()
    .withMessage('ID người dùng phải là UUID hợp lệ'),
  
  body('courseId')
    .notEmpty()
    .withMessage('ID khóa học là bắt buộc')
    .isUUID()
    .withMessage('ID khóa học phải là UUID hợp lệ')
];

// Validation rules cho follow/unfollow center
const validateFollowCenter = [
  body('userId')
    .notEmpty()
    .withMessage('ID người dùng là bắt buộc')
    .isUUID()
    .withMessage('ID người dùng phải là UUID hợp lệ'),
  
  body('centerId')
    .notEmpty()
    .withMessage('ID trung tâm là bắt buộc')
    .isUUID()
    .withMessage('ID trung tâm phải là UUID hợp lệ')
];

// Validation cho route params
const validateUUIDParam = (paramName) => [
  param(paramName)
    .isUUID()
    .withMessage(`${paramName} phải là UUID hợp lệ`)
];

// Validation cho query parameters
const validatePaginationQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Trang phải là số nguyên lớn hơn 0'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Giới hạn phải là số nguyên từ 1 đến 100')
];

// Validation cho top followed courses
const validateTopCoursesQuery = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Giới hạn phải là số nguyên từ 1 đến 50')
];

// Validation cho recent follows
const validateRecentFollowsQuery = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Giới hạn phải là số nguyên từ 1 đến 50')
];

// Validation cho check follow status
const validateCheckFollowQuery = [
  query('userId')
    .notEmpty()
    .withMessage('ID người dùng là bắt buộc')
    .isUUID()
    .withMessage('ID người dùng phải là UUID hợp lệ'),
  
  query('courseId')
    .notEmpty()
    .withMessage('ID khóa học là bắt buộc')
    .isUUID()
    .withMessage('ID khóa học phải là UUID hợp lệ')
];

// Validation cho check follow center status
const validateCheckFollowCenterQuery = [
  query('userId')
    .notEmpty()
    .withMessage('ID người dùng là bắt buộc')
    .isUUID()
    .withMessage('ID người dùng phải là UUID hợp lệ'),
  
  query('centerId')
    .notEmpty()
    .withMessage('ID trung tâm là bắt buộc')
    .isUUID()
    .withMessage('ID trung tâm phải là UUID hợp lệ')
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
  validateFollowCourse,
  validateFollowCenter,
  validateUUIDParam,
  validatePaginationQuery,
  validateTopCoursesQuery,
  validateRecentFollowsQuery,
  validateCheckFollowQuery,
  validateCheckFollowCenterQuery,
  handleValidationErrors
};