const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { 
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
} = require('../middlewares/payment.validator');

/**
 * @swagger
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID của payment
 *         subscriptionId:
 *           type: string
 *           format: uuid
 *           description: ID của subscription
 *         amount:
 *           type: number
 *           description: Số tiền thanh toán
 *         method:
 *           type: string
 *           enum: [momo, bank_transfer, cash, vnpay]
 *           description: Phương thức thanh toán
 *         status:
 *           type: string
 *           enum: [pending, completed, failed, cancelled, refunded]
 *           description: Trạng thái thanh toán
 *         invoiceNo:
 *           type: string
 *           description: Số hóa đơn
 *         transactionId:
 *           type: string
 *           description: Mã giao dịch từ gateway
 *         paidAt:
 *           type: string
 *           format: date-time
 *           description: Thời gian thanh toán thành công
 *         expiredAt:
 *           type: string
 *           format: date-time
 *           description: Thời gian hết hạn
 *         centerId:
 *           type: string
 *           format: uuid
 *           description: ID của center
 *         planId:
 *           type: string
 *           format: uuid
 *           description: ID của plan
 *         planName:
 *           type: string
 *           description: Tên plan
 *         planPrice:
 *           type: number
 *           description: Giá plan
 *         centerName:
 *           type: string
 *           description: Tên center
 *       example:
 *         id: "550e8400-e29b-41d4-a716-446655440000"
 *         subscriptionId: "123e4567-e89b-12d3-a456-426614174000"
 *         amount: 299000
 *         method: "momo"
 *         status: "completed"
 *         invoiceNo: "INV_1703123456_ABC123"
 *         transactionId: "MOMO_1703123456_001"
 *         paidAt: "2025-01-15T10:30:00Z"
 *         centerId: "center-uuid"
 *         planName: "Plan Premium"
 *         centerName: "Trung tâm ABC"
 * 
 *     CreatePaymentRequest:
 *       type: object
 *       required:
 *         - subscriptionId
 *         - method
 *       properties:
 *         subscriptionId:
 *           type: string
 *           format: uuid
 *           description: ID của subscription
 *         method:
 *           type: string
 *           enum: [momo, bank_transfer, cash, vnpay]
 *           description: Phương thức thanh toán
 *         extraData:
 *           type: object
 *           description: Dữ liệu bổ sung
 *       example:
 *         subscriptionId: "123e4567-e89b-12d3-a456-426614174000"
 *         method: "momo"
 * 
 *     MomoPaymentRequest:
 *       type: object
 *       required:
 *         - planId
 *         - centerId
 *       properties:
 *         planId:
 *           type: string
 *           format: uuid
 *           description: ID của plan muốn mua
 *         centerId:
 *           type: string
 *           format: uuid
 *           description: ID của center
 *         returnUrl:
 *           type: string
 *           format: uri
 *           description: URL redirect sau khi thanh toán
 *         userInfo:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               description: Tên người thanh toán
 *             phoneNumber:
 *               type: string
 *               description: Số điện thoại
 *             email:
 *               type: string
 *               format: email
 *               description: Email
 *       example:
 *         planId: "123e4567-e89b-12d3-a456-426614174000"
 *         centerId: "456e7890-e89b-12d3-a456-426614174000"
 *         returnUrl: "https://yoursite.com/payment/success"
 *         userInfo:
 *           name: "Nguyễn Văn A"
 *           phoneNumber: "0901234567"
 *           email: "user@email.com"
 * 
 *     PaymentStats:
 *       type: object
 *       properties:
 *         totalPayments:
 *           type: integer
 *           description: Tổng số payment
 *         totalRevenue:
 *           type: number
 *           description: Tổng doanh thu
 *         averageAmount:
 *           type: number
 *           description: Giá trị trung bình mỗi payment
 * 
 *   tags:
 *     - name: Payments
 *       description: API quản lý thanh toán
 */

/**
 * @swagger
 * /api/v1/payments:
 *   get:
 *     summary: Lấy danh sách tất cả payments
 *     description: Lấy danh sách payments với phân trang và bộ lọc
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Số lượng item trên mỗi trang
 *       - in: query
 *         name: centerId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lọc theo ID center
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, cancelled, refunded]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *           enum: [momo, bank_transfer, cash, vnpay]
 *         description: Lọc theo phương thức thanh toán
 *     responses:
 *       200:
 *         description: Lấy danh sách payments thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payment'
 *                 pagination:
 *                   type: object
 *       500:
 *         description: Lỗi server
 */
router.get('/', 
  validatePaginationQuery,
  handleValidationErrors,
  paymentController.getAllPayments
);




/**
 * @swagger
 * /api/v1/payments/{paymentId}:
 *   get:
 *     summary: Lấy thông tin payment theo ID
 *     description: Lấy thông tin chi tiết của một payment
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của payment
 *     responses:
 *       200:
 *         description: Lấy thông tin payment thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 payment:
 *                   $ref: '#/components/schemas/Payment'
 *       404:
 *         description: Payment không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.get('/:paymentId', 
  validateUUIDParam('paymentId'),
  handleValidationErrors,
  paymentController.getPaymentById
);


/**
 * @swagger
 * /api/v1/payments/momo:
 *   post:
 *     summary: Tạo MoMo payment
 *     description: Tạo yêu cầu thanh toán qua MoMo
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MomoPaymentRequest'
 *     responses:
 *       201:
 *         description: Tạo MoMo payment thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 payment:
 *                   type: object
 *                 momo:
 *                   type: object
 *                   properties:
 *                     payUrl:
 *                       type: string
 *                       description: URL thanh toán MoMo
 *                     qrCodeUrl:
 *                       type: string
 *                       description: URL QR code
 *                     orderId:
 *                       type: string
 *                       description: Mã đơn hàng
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc lỗi từ MoMo
 *       404:
 *         description: Subscription không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.post('/momo', 
  validateMomoPayment,
  handleValidationErrors,
  paymentController.createMomoPayment
);

/**
 * @swagger
 * /api/v1/payments/momo/callback:
 *   post:
 *     summary: MoMo IPN Callback
 *     description: Webhook callback từ MoMo để cập nhật trạng thái thanh toán
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               partnerCode:
 *                 type: string
 *               accessKey:
 *                 type: string
 *               requestId:
 *                 type: string
 *               amount:
 *                 type: string
 *               orderId:
 *                 type: string
 *               orderInfo:
 *                 type: string
 *               resultCode:
 *                 type: string
 *               message:
 *                 type: string
 *               signature:
 *                 type: string
 *     responses:
 *       200:
 *         description: Callback xử lý thành công
 *       400:
 *         description: Signature không hợp lệ
 *       404:
 *         description: Payment không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.post('/momo/callback', 
  validateMomoCallback,
  handleValidationErrors,
  paymentController.momoCallback
);

/**
 * @swagger
 * /api/v1/payments/momo/redirect:
 *   get:
 *     summary: MoMo Redirect
 *     description: Xử lý redirect từ MoMo sau khi thanh toán
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: orderId
 *         schema:
 *           type: string
 *         description: Mã đơn hàng
 *       - in: query
 *         name: resultCode
 *         schema:
 *           type: string
 *         description: Mã kết quả từ MoMo
 *       - in: query
 *         name: message
 *         schema:
 *           type: string
 *         description: Thông báo từ MoMo
 *     responses:
 *       302:
 *         description: Redirect về frontend với kết quả thanh toán
 */
router.get('/momo/redirect', paymentController.momoRedirect);

/**
 * @swagger
 * /api/v1/payments/momo/query/{orderId}:
 *   get:
 *     summary: Query MoMo payment status
 *     description: Query trạng thái thanh toán từ MoMo và cập nhật database
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID từ MoMo
 *     responses:
 *       200:
 *         description: Query thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 payment:
 *                   $ref: '#/components/schemas/Payment'
 *                 momoQuery:
 *                   type: object
 *                   properties:
 *                     resultCode:
 *                       type: number
 *                     message:
 *                       type: string
 *                     transId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     orderId:
 *                       type: string
 *       404:
 *         description: Payment không tồn tại
 *       400:
 *         description: Lỗi query từ MoMo
 */
router.get('/momo/query/:orderId', paymentController.queryMomoPaymentStatus);

/**
 * @swagger
 * /api/v1/payments/{paymentId}/status:
 *   get:
 *     summary: Query trạng thái payment
 *     description: Kiểm tra trạng thái payment hiện tại
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của payment
 *     responses:
 *       200:
 *         description: Query trạng thái thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 payment:
 *                   $ref: '#/components/schemas/Payment'
 *       404:
 *         description: Payment không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.get('/:paymentId/status', 
  validateQueryPayment,
  handleValidationErrors,
  paymentController.queryPaymentStatus
);

/**
 * @swagger
 * /api/v1/payments/momo/query/{orderId}:
 *   post:
 *     summary: Query MoMo payment status
 *     description: Query trạng thái payment từ MoMo và cập nhật database
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID từ MoMo
 *     responses:
 *       200:
 *         description: Query thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 payment:
 *                   $ref: '#/components/schemas/Payment'
 *                 momoQuery:
 *                   type: object
 *                   properties:
 *                     resultCode:
 *                       type: number
 *                     message:
 *                       type: string
 *                     orderId:
 *                       type: string
 *       404:
 *         description: Payment không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.post('/momo/query/:orderId', paymentController.queryMomoPaymentStatus);

/**
 * @swagger
 * /api/v1/payments/{paymentId}:
 *   put:
 *     summary: Cập nhật payment
 *     description: Cập nhật thông tin payment
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của payment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, completed, failed, cancelled, refunded]
 *               transactionId:
 *                 type: string
 *               invoiceNo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật payment thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Payment không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.put('/:paymentId', 
  validateUpdatePayment,
  handleValidationErrors,
  paymentController.updatePayment
);

/**
 * @swagger
 * /api/v1/payments/{paymentId}/cancel:
 *   put:
 *     summary: Hủy payment
 *     description: Hủy một payment đang pending
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của payment
 *     responses:
 *       200:
 *         description: Hủy payment thành công
 *       400:
 *         description: Không thể hủy payment đã hoàn thành
 *       404:
 *         description: Payment không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.put('/:paymentId/cancel', 
  validateUUIDParam('paymentId'),
  handleValidationErrors,
  paymentController.cancelPayment
);

/**
 * @swagger
 * /api/v1/payments/{paymentId}/refund:
 *   post:
 *     summary: Hoàn tiền payment
 *     description: Hoàn tiền một payment đã hoàn thành
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của payment
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Số tiền hoàn trả (mặc định toàn bộ)
 *               reason:
 *                 type: string
 *                 description: Lý do hoàn tiền
 *     responses:
 *       200:
 *         description: Hoàn tiền thành công
 *       400:
 *         description: Không thể hoàn tiền hoặc lỗi từ gateway
 *       404:
 *         description: Payment không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.post('/:paymentId/refund', 
  validateRefundPayment,
  handleValidationErrors,
  paymentController.refundPayment
);

/**
 * @swagger
 * /api/v1/payments/subscription/{subscriptionId}:
 *   get:
 *     summary: Lấy payments theo subscription
 *     description: Lấy danh sách payments của một subscription
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của subscription
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Số lượng item trên mỗi trang
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, cancelled, refunded]
 *         description: Lọc theo trạng thái
 *     responses:
 *       200:
 *         description: Lấy danh sách payments theo subscription thành công
 *       404:
 *         description: Subscription không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.get('/subscription/:subscriptionId', 
  validateUUIDParam('subscriptionId'),
  validatePaginationQuery,
  handleValidationErrors,
  paymentController.getPaymentsBySubscription
);

module.exports = router;