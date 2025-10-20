const { body, param, query, validationResult } = require('express-validator');

// Validation rules cho tạo payment mới
const validateCreatePayment = [
  body('subscriptionId')
    .notEmpty()
    .withMessage('ID subscription là bắt buộc')
    .isUUID()
    .withMessage('ID subscription phải là UUID hợp lệ'),
  
  body('planId')
    .optional()
    .isUUID()
    .withMessage('ID plan phải là UUID hợp lệ'),
    
  body('centerId')
    .optional()
    .isUUID()
    .withMessage('ID center phải là UUID hợp lệ'),

  body('method')
    .notEmpty()
    .withMessage('Phương thức thanh toán là bắt buộc')
    .isIn(['momo', 'bank_transfer', 'cash', 'vnpay'])
    .withMessage('Phương thức thanh toán phải là: momo, bank_transfer, cash, vnpay'),

  body('returnUrl')
    .optional()
    .isURL()
    .withMessage('Return URL phải là URL hợp lệ'),

  body('extraData')
    .optional()
    .isObject()
    .withMessage('Extra data phải là object')
];

// Validation rules cho MoMo payment
const validateMomoPayment = [
  body('planId')
    .notEmpty()
    .withMessage('ID plan là bắt buộc')
    .isUUID()
    .withMessage('ID plan phải là UUID hợp lệ'),

  body('centerId')
    .notEmpty()
    .withMessage('ID center là bắt buộc')
    .isUUID()
    .withMessage('ID center phải là UUID hợp lệ'),

  body('returnUrl')
    .optional()
    .isURL()
    .withMessage('Return URL phải là URL hợp lệ'),

  body('userInfo')
    .optional()
    .isObject()
    .withMessage('User info phải là object'),

  body('userInfo.name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Tên người dùng phải có từ 2-100 ký tự'),

  body('userInfo.phoneNumber')
    .optional()
    .matches(/^(\+84|0)[0-9]{9,10}$/)
    .withMessage('Số điện thoại không hợp lệ'),

  body('userInfo.email')
    .optional()
    .isEmail()
    .withMessage('Email không hợp lệ')
];

// Validation cho callback MoMo
const validateMomoCallback = [
  body('partnerCode')
    .notEmpty()
    .withMessage('Partner code là bắt buộc'),

  body('accessKey')
    .notEmpty()
    .withMessage('Access key là bắt buộc'),

  body('requestId')
    .notEmpty()
    .withMessage('Request ID là bắt buộc'),

  body('amount')
    .notEmpty()
    .withMessage('Amount là bắt buộc')
    .isNumeric()
    .withMessage('Amount phải là số'),

  body('orderId')
    .notEmpty()
    .withMessage('Order ID là bắt buộc'),

  body('orderInfo')
    .notEmpty()
    .withMessage('Order info là bắt buộc'),

  body('resultCode')
    .notEmpty()
    .withMessage('Result code là bắt buộc')
    .isNumeric()
    .withMessage('Result code phải là số'),

  body('message')
    .notEmpty()
    .withMessage('Message là bắt buộc'),

  body('signature')
    .notEmpty()
    .withMessage('Signature là bắt buộc')
];

// Validation cho query status
const validateQueryPayment = [
  param('paymentId')
    .isUUID()
    .withMessage('Payment ID phải là UUID hợp lệ')
];

// Validation cho refund
const validateRefundPayment = [
  param('paymentId')
    .isUUID()
    .withMessage('Payment ID phải là UUID hợp lệ'),

  body('amount')
    .optional()
    .isFloat({ min: 1000 })
    .withMessage('Số tiền hoàn trả phải ít nhất 1,000 VND'),

  body('reason')
    .optional()
    .isLength({ min: 5, max: 255 })
    .withMessage('Lý do hoàn trả phải có từ 5-255 ký tự')
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
    .withMessage('Giới hạn phải là số nguyên từ 1 đến 100'),

  query('status')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'cancelled', 'refunded'])
    .withMessage('Status phải là: pending, completed, failed, cancelled, refunded'),

  query('method')
    .optional()
    .isIn(['momo', 'bank_transfer', 'cash', 'vnpay'])
    .withMessage('Method phải là: momo, bank_transfer, cash, vnpay'),

  query('centerId')
    .optional()
    .isUUID()
    .withMessage('Center ID phải là UUID hợp lệ')
];

// Validation cho revenue query
const validateRevenueQuery = [
  query('centerId')
    .notEmpty()
    .withMessage('Center ID là bắt buộc')
    .isUUID()
    .withMessage('Center ID phải là UUID hợp lệ'),

  query('startDate')
    .optional()
    .isDate()
    .withMessage('Start date phải là định dạng ngày hợp lệ (YYYY-MM-DD)'),

  query('endDate')
    .optional()
    .isDate()
    .withMessage('End date phải là định dạng ngày hợp lệ (YYYY-MM-DD)')
    .custom((value, { req }) => {
      if (value && req.query.startDate) {
        const startDate = new Date(req.query.startDate);
        const endDate = new Date(value);
        
        if (endDate <= startDate) {
          throw new Error('End date phải sau start date');
        }
      }
      return true;
    })
];

// Validation cho update payment
const validateUpdatePayment = [
  param('paymentId')
    .isUUID()
    .withMessage('Payment ID phải là UUID hợp lệ'),

  body('status')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'cancelled', 'refunded'])
    .withMessage('Status phải là: pending, completed, failed, cancelled, refunded'),

  body('transactionId')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Transaction ID phải có từ 1-100 ký tự'),

  body('invoiceNo')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Invoice No phải có từ 1-50 ký tự')
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
  validateCreatePayment,
  validateMomoPayment,
  validateMomoCallback,
  validateQueryPayment,
  validateRefundPayment,
  validateUUIDParam,
  validatePaginationQuery,
  validateRevenueQuery,
  validateUpdatePayment,
  handleValidationErrors
};