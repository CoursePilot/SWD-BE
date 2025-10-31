const express = require('express');
const router = express.Router();
const leadController = require('../controllers/lead.controller');
const { upload, handleMulterError } = require('../middlewares/upload.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Lead:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         courseId:
 *           type: string
 *           format: uuid
 *         scheduleId:
 *           type: string
 *           format: uuid
 *         studentId:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         phone:
 *           type: string
 *         note:
 *           type: string
 *         consentAt:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [new, assigned, contacted, qualified, disqualified, enrolled, lost]
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/leads:
 *   post:
 *     summary: Tạo lead mới
 *     description: Tạo lead mới và kiểm tra quota subscription
 *     tags: [Leads]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseId
 *               - studentId
 *             properties:
 *               courseId:
 *                 type: string
 *                 format: uuid
 *                 description: ID của course
 *                 example: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *               scheduleId:
 *                 type: string
 *                 format: uuid
 *                 description: ID của schedule (optional)
 *                 example: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *               studentId:
 *                 type: string
 *                 format: uuid
 *                 description: ID của student (REQUIRED) - sẽ tự động điền name, email, phone từ users table
 *                 example: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *               note:
 *                 type: string
 *                 description: Ghi chú (optional)
 *                 example: "Student quan tâm đến khóa học này"
 *               consentAt:
 *                 type: string
 *                 format: date-time
 *                 description: Thời gian đồng ý (optional)
 *                 example: "2025-10-20T12:53:47.075Z"
 *               name:
 *                 type: string
 *                 description: "[AUTO-FILL] Tên khách hàng (tự động từ studentId, có thể override nếu cần)"
 *               email:
 *                 type: string
 *                 description: "[AUTO-FILL] Email khách hàng (tự động từ studentId, có thể override nếu cần)"
 *               phone:
 *                 type: string
 *                 description: "[AUTO-FILL] Số điện thoại (tự động từ studentId, có thể override nếu cần)"
 *             example:
 *               courseId: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *               scheduleId: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *               studentId: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *               note: "Student quan tâm đến khóa học này"
 *     responses:
 *       201:
 *         description: Tạo lead thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Tạo lead thành công"
 *                 lead:
 *                   $ref: '#/components/schemas/Lead'
 *                 quota:
 *                   type: object
 *                   properties:
 *                     used:
 *                       type: integer
 *                       description: Số lead đã sử dụng
 *                     limit:
 *                       type: integer
 *                       description: Giới hạn lead
 *                     remaining:
 *                       type: integer
 *                       description: Số lead còn lại
 *                 autoFilled:
 *                   type: object
 *                   description: Thông tin tự động điền (chỉ có khi sử dụng studentId)
 *                   properties:
 *                     from:
 *                       type: string
 *                       example: "student"
 *                     studentInfo:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         fullName:
 *                           type: string
 *                         email:
 *                           type: string
 *                         phone:
 *                           type: string
 *       403:
 *         description: Hết quota lead
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Đã hết quota lead"
 *       404:
 *         description: Center không tồn tại
 */
router.post('/', leadController.createLead);

/**
 * @swagger
 * /api/v1/leads:
 *   get:
 *     summary: Lấy danh sách leads
 *     tags: [Leads]
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
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: centerId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách leads
 */
router.get('/', leadController.getAllLeads);

/**
 * @swagger
 * /api/v1/leads/{leadId}:
 *   get:
 *     summary: Lấy thông tin lead
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thông tin lead
 *       404:
 *         description: Lead không tồn tại
 */
router.get('/:leadId', leadController.getLeadById);

/**
 * @swagger
 * /api/v1/leads/{leadId}:
 *   put:
 *     summary: Cập nhật lead
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               courseId:
 *                 type: string
 *                 format: uuid
 *                 description: ID của course
 *               scheduleId:
 *                 type: string
 *                 format: uuid
 *                 description: ID của schedule
 *               studentId:
 *                 type: string
 *                 format: uuid
 *                 description: ID của student
 *               name:
 *                 type: string
 *                 description: Tên khách hàng
 *               phone:
 *                 type: string
 *                 description: Số điện thoại
 *               email:
 *                 type: string
 *                 description: Email
 *               note:
 *                 type: string
 *                 description: Ghi chú
 *               status:
 *                 type: string
 *                 enum: [new, assigned, contacted, qualified, disqualified, enrolled, lost]
 *                 description: Trạng thái lead
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Lead không tồn tại
 */
router.put('/:leadId', upload.none(), handleMulterError, leadController.updateLead);

/**
 * @swagger
 * /api/v1/leads/{leadId}:
 *   delete:
 *     summary: Xóa lead
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       404:
 *         description: Lead không tồn tại
 */
router.delete('/:leadId', leadController.deleteLead);

/**
 * @swagger
 * /api/v1/leads/center/{centerId}:
 *   get:
 *     summary: Lấy leads theo center
 *     description: Lấy danh sách leads của center với filter theo course (optional)
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: centerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của center
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
 *         description: Số lượng items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, assigned, contacted, qualified, disqualified, enrolled, lost]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lọc theo course ID (optional)
 *     responses:
 *       200:
 *         description: Danh sách leads theo center
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 centerId:
 *                   type: string
 *                 courseId:
 *                   type: string
 *                   nullable: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       courseId:
 *                         type: string
 *                       courseTitle:
 *                         type: string
 *                         description: Tên khóa học
 *                       courseSummary:
 *                         type: string
 *                         description: Tóm tắt khóa học
 *                       studentId:
 *                         type: string
 *                       studentName:
 *                         type: string
 *                         description: Tên học viên
 *                       studentEmail:
 *                         type: string
 *                         description: Email học viên
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       status:
 *                         type: string
 *                       note:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
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
 */
router.get('/center/:centerId', leadController.getLeadsByCenter);

/**
 * @swagger
 * /api/v1/leads/course/{courseId}:
 *   get:
 *     summary: Lấy danh sách leads theo course
 *     description: Lấy danh sách leads thuộc một course cụ thể với phân trang và filter
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của course
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
 *         description: Số lượng items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, assigned, contacted, qualified, disqualified, enrolled, lost]
 *         description: Lọc theo status
 *     responses:
 *       200:
 *         description: Lấy danh sách leads thành công
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       courseId:
 *                         type: string
 *                       courseTitle:
 *                         type: string
 *                       courseSummary:
 *                         type: string
 *                       centerId:
 *                         type: string
 *                       centerName:
 *                         type: string
 *                       scheduleId:
 *                         type: string
 *                       scheduleStartDate:
 *                         type: string
 *                         format: date-time
 *                       scheduleEndDate:
 *                         type: string
 *                         format: date-time
 *                       studentId:
 *                         type: string
 *                       studentName:
 *                         type: string
 *                       studentEmail:
 *                         type: string
 *                       studentPhone:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       note:
 *                         type: string
 *                       consentAt:
 *                         type: string
 *                         format: date-time
 *                       status:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
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
 *       404:
 *         description: Course không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.get('/course/:courseId', leadController.getLeadsByCourse);

module.exports = router;