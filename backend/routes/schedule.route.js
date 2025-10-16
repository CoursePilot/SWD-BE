const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/schedule.controller');
const { 
  validateCreateSchedule, 
  validateUpdateSchedule, 
  handleValidationErrors 
} = require('../middlewares/schedule.validator');

/**
 * @swagger
 * components:
 *   schemas:
 *     Schedule:
 *       type: object
 *       required:
 *         - courseId
 *         - startDate
 *         - endDate
 *         - seats
 *         - location
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID của lịch học
 *         courseId:
 *           type: string
 *           format: uuid
 *           description: ID của khóa học
 *         startDate:
 *           type: string
 *           format: date
 *           description: Ngày bắt đầu
 *         endDate:
 *           type: string
 *           format: date
 *           description: Ngày kết thúc
 *         seats:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           description: Số chỗ ngồi
 *         location:
 *           type: string
 *           minLength: 5
 *           maxLength: 255
 *           description: Địa điểm
 *         status:
 *           type: string
 *           enum: [open, full, cancelled]
 *           description: Trạng thái lịch học
 *         courseTitle:
 *           type: string
 *           description: Tên khóa học
 *         courseSummary:
 *           type: string
 *           description: Tóm tắt khóa học
 *       example:
 *         id: "550e8400-e29b-41d4-a716-446655440000"
 *         courseId: "cf39157-c67c-42cf-873f-b7c30fca6efa"
 *         startDate: "2025-01-15"
 *         endDate: "2025-02-15"
 *         seats: 30
 *         location: "Phòng A101, Tòa nhà ABC, 123 Đường XYZ, Quận 1, TP.HCM"
 *         status: "open"
 *         courseTitle: "Khóa học IELTS 7.0+"
 *         courseSummary: "Khóa học IELTS toàn diện"
 * 
 *     CreateScheduleRequest:
 *       type: object
 *       required:
 *         - courseId
 *         - startDate
 *         - endDate
 *         - seats
 *         - location
 *       properties:
 *         courseId:
 *           type: string
 *           format: uuid
 *         startDate:
 *           type: string
 *           format: date
 *         endDate:
 *           type: string
 *           format: date
 *         seats:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *         location:
 *           type: string
 *           minLength: 5
 *           maxLength: 255
 *         status:
 *           type: string
 *           enum: [open, full, cancelled]
 *           default: open
 *       example:
 *         courseId: "cf39157-c67c-42cf-873f-b7c30fca6efa"
 *         startDate: "2025-01-15"
 *         endDate: "2025-02-15"
 *         seats: 30
 *         location: "Phòng A101, Tòa nhà ABC, 123 Đường XYZ, Quận 1, TP.HCM"
 *         status: "open"
 * 
 *     UpdateScheduleRequest:
 *       type: object
 *       properties:
 *         courseId:
 *           type: string
 *           format: uuid
 *         startDate:
 *           type: string
 *           format: date
 *         endDate:
 *           type: string
 *           format: date
 *         seats:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *         location:
 *           type: string
 *           minLength: 5
 *           maxLength: 255
 *         status:
 *           type: string
 *           enum: [open, full, cancelled]
 *       example:
 *         seats: 35
 *         status: "full"
 * 
 *   tags:
 *     - name: Schedules
 *       description: API quản lý lịch học
 */

/**
 * @swagger
 * /api/v1/schedules:
 *   get:
 *     summary: Lấy danh sách tất cả lịch học
 *     description: Lấy danh sách lịch học với phân trang và bộ lọc
 *     tags: [Schedules]
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
 *         name: courseId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lọc theo ID khóa học
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, full, cancelled]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Lọc từ ngày bắt đầu
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Lọc đến ngày kết thúc
 *     responses:
 *       200:
 *         description: Lấy danh sách lịch học thành công
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
 *                     $ref: '#/components/schemas/Schedule'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *       500:
 *         description: Lỗi server
 */
router.get('/', scheduleController.getAllSchedules);

/**
 * @swagger
 * /api/v1/schedules/upcoming:
 *   get:
 *     summary: Lấy danh sách lịch học sắp diễn ra
 *     description: Lấy danh sách lịch học sắp diễn ra trong vòng 30 ngày
 *     tags: [Schedules]
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
 *         name: courseId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lọc theo ID khóa học
 *     responses:
 *       200:
 *         description: Lấy danh sách lịch học sắp diễn ra thành công
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
 *                     $ref: '#/components/schemas/Schedule'
 *                 pagination:
 *                   type: object
 *       500:
 *         description: Lỗi server
 */
router.get('/upcoming', scheduleController.getUpcomingSchedules);

/**
 * @swagger
 * /api/v1/schedules/{id}:
 *   get:
 *     summary: Lấy thông tin lịch học theo ID
 *     description: Lấy thông tin chi tiết của một lịch học
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của lịch học
 *     responses:
 *       200:
 *         description: Lấy thông tin lịch học thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 schedule:
 *                   $ref: '#/components/schemas/Schedule'
 *       404:
 *         description: Lịch học không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.get('/:id', scheduleController.getScheduleById);

/**
 * @swagger
 * /api/v1/schedules:
 *   post:
 *     summary: Tạo lịch học mới
 *     description: Tạo một lịch học mới cho khóa học
 *     tags: [Schedules]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateScheduleRequest'
 *     responses:
 *       201:
 *         description: Tạo lịch học thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 schedule:
 *                   $ref: '#/components/schemas/Schedule'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Khóa học không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.post('/', 
  validateCreateSchedule,
  handleValidationErrors,
  scheduleController.createSchedule
);

/**
 * @swagger
 * /api/v1/schedules/{id}:
 *   put:
 *     summary: Cập nhật lịch học
 *     description: Cập nhật thông tin lịch học
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của lịch học
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateScheduleRequest'
 *     responses:
 *       200:
 *         description: Cập nhật lịch học thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 schedule:
 *                   $ref: '#/components/schemas/Schedule'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Lịch học không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.put('/:id', 
  validateUpdateSchedule,
  handleValidationErrors,
  scheduleController.updateSchedule
);

/**
 * @swagger
 * /api/v1/schedules/{id}:
 *   delete:
 *     summary: Xóa lịch học
 *     description: Xóa một lịch học
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của lịch học
 *     responses:
 *       200:
 *         description: Xóa lịch học thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Lịch học không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.delete('/:id', scheduleController.deleteSchedule);

/**
 * @swagger
 * /api/v1/schedules/course/{courseId}:
 *   get:
 *     summary: Lấy danh sách lịch học theo khóa học
 *     description: Lấy danh sách lịch học của một khóa học cụ thể
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của khóa học
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
 *           enum: [open, full, cancelled]
 *         description: Lọc theo trạng thái
 *     responses:
 *       200:
 *         description: Lấy danh sách lịch học theo khóa học thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 courseId:
 *                   type: string
 *                 courseTitle:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Schedule'
 *                 pagination:
 *                   type: object
 *       404:
 *         description: Khóa học không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.get('/course/:courseId', scheduleController.getSchedulesByCourse);

module.exports = router;