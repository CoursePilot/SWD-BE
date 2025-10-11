const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const { auth, isAdminOrEmployee } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * /api/v1/subscriptions:
 *   get:
 *     summary: Lấy tất cả đăng ký của trung tâm
 *     description: Center/Admin lấy danh sách subscriptions của center hiện tại
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng item per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, cancelled, expired]
 *         description: Lọc theo trạng thái
 *     responses:
 *       200:
 *         description: Lấy danh sách đăng ký thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 subscriptions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       centerId:
 *                         type: string
 *                       planId:
 *                         type: string
 *                       planName:
 *                         type: string
 *                       planPrice:
 *                         type: number
 *                       planDurationDays:
 *                         type: integer
 *                       startAt:
 *                         type: string
 *                       endAt:
 *                         type: string
 *                       status:
 *                         type: string
 *                       autoRenew:
 *                         type: boolean
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/', 
  auth,
  isAdminOrEmployee,
  subscriptionController.getMySubscriptions
);

/**
 * @swagger
 * /api/v1/subscriptions/{id}:
 *   get:
 *     summary: Xem chi tiết đăng ký
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của đăng ký
 *     responses:
 *       200:
 *         description: Lấy thông tin đăng ký thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 subscription:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     centerId:
 *                       type: string
 *                     planId:
 *                       type: string
 *                     startAt:
 *                       type: string
 *                     endAt:
 *                       type: string
 *                     status:
 *                       type: string
 *                     autoRenew:
 *                       type: boolean
 *       404:
 *         description: Không tìm thấy đăng ký
 */
router.get('/:id', 
  auth,
  isAdminOrEmployee,
  subscriptionController.getSubscriptionById
);

/**
 * @swagger
 * /api/v1/subscriptions:
 *   post:
 *     summary: Đăng ký gói mới (center chọn plan)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *             properties:
 *               planId:
 *                 type: string
 *               autoRenew:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Tạo đăng ký thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 subscription:
 *                   type: object
 *       400:
 *         description: Thiếu dữ liệu hoặc không hợp lệ
 *       401:
 *         description: Unauthorized
 */
router.post('/', 
  auth,
  isAdminOrEmployee,
  subscriptionController.createSubscription
);

/**
 * @swagger
 * /api/v1/subscriptions/{id}/cancel:
 *   patch:
 *     summary: Hủy đăng ký (ghi lý do)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Hủy đăng ký thành công
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Không tìm thấy đăng ký
 */
router.patch('/:id/cancel', 
  auth,
  isAdminOrEmployee,
  subscriptionController.cancelSubscription
);

/**
 * @swagger
 * /api/v1/subscriptions/{id}/renew:
 *   patch:
 *     summary: Gia hạn gói từ thời điểm hiện tại theo durationDays của plan
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Gia hạn thành công
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Không tìm thấy đăng ký
 */
router.patch('/:id/renew', 
  auth,
  isAdminOrEmployee,
  subscriptionController.renewSubscription
);

/**
 * @swagger
 * /api/v1/subscriptions/{id}:
 *   delete:
 *     summary: Xóa đăng ký (soft delete)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa đăng ký thành công
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Không tìm thấy đăng ký
 */
router.delete('/:id', 
  auth,
  isAdminOrEmployee,
  subscriptionController.deleteSubscription
);

module.exports = router;


