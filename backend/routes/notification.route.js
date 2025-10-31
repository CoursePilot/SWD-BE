const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { auth } = require('../middlewares/auth.middleware');
const { upload, handleMulterError } = require('../middlewares/upload.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         centerId:
 *           type: string
 *           format: uuid
 *         type:
 *           type: string
 *           enum: [lead, reminder, system]
 *           description: Loại thông báo (lead, reminder, hoặc system)
 *         payload:
 *           type: object
 *           description: Dữ liệu JSON của notification
 *         readAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         isDeleted:
 *           type: boolean
 */

/**
 * @swagger
 * /api/v1/notifications:
 *   post:
 *     summary: Tạo notification mới
 *     description: Tạo notification mới với các loại thông báo khác nhau
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - type
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: ID của user nhận notification
 *               centerId:
 *                 type: string
 *                 format: uuid
 *                 description: ID của center liên quan (optional)
 *               type:
 *                 type: string
 *                 enum: [lead, reminder, system]
 *                 description: |
 *                   Loại thông báo:
 *                   - lead: Thông báo về lead mới
 *                   - reminder: Thông báo nhắc nhở
 *                   - system: Thông báo hệ thống
 *               payload:
 *                 type: string
 *                 description: Dữ liệu chi tiết của notification (JSON string)
 *                 example: '{"title":"Lead mới","message":"Bạn có 1 lead mới","leadId":"123"}'
 *     responses:
 *       201:
 *         description: Tạo notification thành công
 *       400:
 *         description: Dữ liệu không hợp lệ (type phải là lead, reminder hoặc system)
 *       401:
 *         description: Chưa đăng nhập
 */
router.post('/', auth, upload.none(), handleMulterError, notificationController.createNotification);

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: Lấy tất cả notifications
 *     description: Lấy danh sách tất cả notifications với filter
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: centerId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [lead, reminder, system]
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Danh sách notifications
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/', auth, notificationController.getAllNotifications);

/**
 * @swagger
 * /api/v1/notifications/my:
 *   get:
 *     summary: Lấy notifications của tôi
 *     description: Lấy danh sách notifications của user hiện tại
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *         description: Filter theo trạng thái đã đọc/chưa đọc
 *     responses:
 *       200:
 *         description: Danh sách notifications của user
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/my', auth, notificationController.getMyNotifications);

/**
 * @swagger
 * /api/v1/notifications/unread-count:
 *   get:
 *     summary: Đếm số notification chưa đọc
 *     description: Lấy số lượng notifications chưa đọc của user hiện tại
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: centerId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lọc theo center (optional)
 *     responses:
 *       200:
 *         description: Số lượng notifications chưa đọc
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/unread-count', auth, notificationController.getUnreadCount);

/**
 * @swagger
 * /api/v1/notifications/mark-all-read:
 *   post:
 *     summary: Đánh dấu tất cả đã đọc
 *     description: Đánh dấu tất cả notifications của user là đã đọc
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: centerId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chỉ đánh dấu notifications của center này (optional)
 *     responses:
 *       200:
 *         description: Đánh dấu thành công
 *       401:
 *         description: Chưa đăng nhập
 */
router.post('/mark-all-read', auth, notificationController.markAllAsRead);

/**
 * @swagger
 * /api/v1/notifications/delete-all:
 *   delete:
 *     summary: Xóa tất cả notifications
 *     description: Xóa tất cả notifications của user hiện tại
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       401:
 *         description: Chưa đăng nhập
 */
router.delete('/delete-all', auth, notificationController.deleteAllMyNotifications);

/**
 * @swagger
 * /api/v1/notifications/{id}:
 *   get:
 *     summary: Lấy notification theo ID
 *     description: Lấy thông tin chi tiết của 1 notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Thông tin notification
 *       401:
 *         description: Chưa đăng nhập
 *       404:
 *         description: Notification không tồn tại
 */
router.get('/:id', auth, notificationController.getNotificationById);

/**
 * @swagger
 * /api/v1/notifications/{id}/read:
 *   post:
 *     summary: Đánh dấu đã đọc
 *     description: Đánh dấu 1 notification là đã đọc
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Đánh dấu thành công
 *       401:
 *         description: Chưa đăng nhập
 *       404:
 *         description: Notification không tồn tại
 */
router.post('/:id/read', auth, notificationController.markAsRead);

/**
 * @swagger
 * /api/v1/notifications/{id}:
 *   put:
 *     summary: Cập nhật notification
 *     description: Cập nhật thông tin notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [lead, reminder, system]
 *               payload:
 *                 type: string
 *                 description: Dữ liệu JSON (string)
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       401:
 *         description: Chưa đăng nhập
 *       404:
 *         description: Notification không tồn tại
 */
router.put('/:id', auth, upload.none(), handleMulterError, notificationController.updateNotification);

/**
 * @swagger
 * /api/v1/notifications/{id}:
 *   delete:
 *     summary: Xóa notification
 *     description: Xóa 1 notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       401:
 *         description: Chưa đăng nhập
 *       404:
 *         description: Notification không tồn tại
 */
router.delete('/:id', auth, notificationController.deleteNotification);

module.exports = router;
