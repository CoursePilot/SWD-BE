const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course.controller');
const { auth, isAdmin, isAdminOrEmployee } = require('../middlewares/auth.middleware');
const { 
  validateCreateCourse, 
  validateUpdateCourse, 
  validateUUIDParam,
  handleValidationErrors 
} = require('../middlewares/course.validator');

// ==================== PUBLIC ROUTES ====================

/**
 * @swagger
 * components:
 *   schemas:
 *     Course:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID khóa học
 *         centerId:
 *           type: string
 *           format: uuid
 *           description: ID trung tâm
 *         categoryId:
 *           type: string
 *           format: uuid
 *           description: ID danh mục
 *         title:
 *           type: string
 *           description: Tiêu đề khóa học
 *         summary:
 *           type: string
 *           description: Tóm tắt khóa học
 *         content:
 *           type: string
 *           description: Nội dung chi tiết
 *         priceMin:
 *           type: number
 *           description: Giá tối thiểu
 *         priceMax:
 *           type: number
 *           description: Giá tối đa
 *         modality:
 *           type: string
 *           enum: [online, offline, hybrid]
 *           description: Hình thức học
 *         status:
 *           type: string
 *           enum: [draft, published, archived]
 *           description: Trạng thái khóa học
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Thời gian tạo
 *         centerName:
 *           type: string
 *           description: Tên trung tâm
 *         centerLogo:
 *           type: string
 *           description: Logo trung tâm
 */

/**
 * @swagger
 * /api/v1/courses:
 *   get:
 *     summary: Lấy danh sách tất cả khóa học
 *     description: Lấy danh sách khóa học với filter và pagination (public)
 *     tags: [Courses]
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
 *         description: Số lượng khóa học mỗi trang
 *       - in: query
 *         name: centerId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lọc theo ID trung tâm
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lọc theo ID danh mục
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, archived]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: modality
 *         schema:
 *           type: string
 *           enum: [online, offline, hybrid]
 *         description: Lọc theo hình thức học
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tiêu đề hoặc tóm tắt
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
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
 *                     $ref: '#/components/schemas/Course'
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
router.get('/', courseController.getAllCourses);

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   get:
 *     summary: Lấy thông tin khóa học theo ID
 *     description: Lấy thông tin chi tiết của một khóa học (public)
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID khóa học
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 course:
 *                   $ref: '#/components/schemas/Course'
 *       404:
 *         description: Khóa học không tồn tại
 */
router.get('/:id', courseController.getCourseById);

/**
 * @swagger
 * /api/v1/courses/center/{centerId}:
 *   get:
 *     summary: Lấy khóa học theo trung tâm
 *     description: Lấy danh sách khóa học của một trung tâm cụ thể
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: centerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID trung tâm
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
 *         description: Số lượng khóa học mỗi trang
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, archived]
 *         description: Lọc theo trạng thái
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       404:
 *         description: Trung tâm không tồn tại
 */
router.get('/center/:centerId', courseController.getCoursesByCenter);

// ==================== AUTHENTICATED ROUTES ====================

/**
 * @swagger
 * /api/v1/courses:
 *   post:
 *     summary: Tạo khóa học mới
 *     description: Tạo khóa học mới (chỉ admin hoặc owner của center)
 *     tags: [Courses]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - centerId
 *               - categoryId
 *               - title
 *               - summary
 *               - content
 *               - priceMin
 *               - priceMax
 *               - modality
 *             properties:
 *               centerId:
 *                 type: string
 *                 format: uuid
 *                 description: ID trung tâm
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *                 description: ID danh mục
 *               title:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 200
 *                 description: Tiêu đề khóa học
 *               summary:
 *                 type: string
 *                 minLength: 20
 *                 maxLength: 500
 *                 description: Tóm tắt khóa học
 *               content:
 *                 type: string
 *                 minLength: 50
 *                 maxLength: 10000
 *                 description: Nội dung chi tiết
 *               priceMin:
 *                 type: number
 *                 minimum: 0
 *                 description: Giá tối thiểu
 *               priceMax:
 *                 type: number
 *                 minimum: 0
 *                 description: Giá tối đa
 *               modality:
 *                 type: string
 *                 enum: [online, offline, hybrid]
 *                 description: Hình thức học
 *               status:
 *                 type: string
 *                 enum: [draft, published, archived]
 *                 default: draft
 *                 description: Trạng thái khóa học
 *     responses:
 *       201:
 *         description: Tạo khóa học thành công
 *       400:
 *         description: Validation error hoặc center chưa được approve
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Không có quyền tạo khóa học cho center này
 *       404:
 *         description: Trung tâm không tồn tại
 */
router.post('/', 
  validateCreateCourse,
  handleValidationErrors,
  courseController.createCourse
);

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   put:
 *     summary: Cập nhật khóa học
 *     description: Cập nhật thông tin khóa học
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID khóa học
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               centerId:
 *                 type: string
 *                 format: uuid
 *                 description: ID trung tâm
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *                 description: ID danh mục
 *               title:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 200
 *                 description: Tiêu đề khóa học
 *               summary:
 *                 type: string
 *                 minLength: 20
 *                 maxLength: 500
 *                 description: Tóm tắt khóa học
 *               content:
 *                 type: string
 *                 minLength: 50
 *                 maxLength: 10000
 *                 description: Nội dung chi tiết
 *               priceMin:
 *                 type: number
 *                 minimum: 0
 *                 description: Giá tối thiểu
 *               priceMax:
 *                 type: number
 *                 minimum: 0
 *                 description: Giá tối đa
 *               modality:
 *                 type: string
 *                 enum: [online, offline, hybrid]
 *                 description: Hình thức học
 *               status:
 *                 type: string
 *                 enum: [draft, published, archived]
 *                 description: Trạng thái khóa học
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Không có quyền cập nhật khóa học này
 *       404:
 *         description: Khóa học không tồn tại
 */
router.put('/:id', 
  validateUpdateCourse,
  handleValidationErrors,
  courseController.updateCourse
);

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   delete:
 *     summary: Xóa khóa học
 *     description: Xóa khóa học (soft delete)
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID khóa học
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Không có quyền xóa khóa học này
 *       404:
 *         description: Khóa học không tồn tại
 */
router.delete('/:id', 
  courseController.deleteCourse
);

/**
 * @swagger
 * /api/v1/courses/my:
 *   get:
 *     summary: Lấy khóa học của tôi
 *     description: Lấy danh sách khóa học của center mà user sở hữu
 *     tags: [Courses]
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
 *         description: Số lượng khóa học mỗi trang
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, archived]
 *         description: Lọc theo trạng thái
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Bạn chưa có trung tâm nào
 */
router.get('/my', 
  courseController.getMyCourses
);

/**
 * @swagger
 * /api/v1/courses/{courseId}/approve:
 *   post:
 *     summary: Admin approve course
 *     description: Admin phê duyệt course
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adminNote:
 *                 type: string
 *     responses:
 *       200:
 *         description: Approve thành công
 *       404:
 *         description: Course không tồn tại
 */
router.post('/:courseId/approve', courseController.approveCourse);

/**
 * @swagger
 * /api/v1/courses/{courseId}/reject:
 *   post:
 *     summary: Admin reject course
 *     description: Admin từ chối course
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adminNote:
 *                 type: string
 *               refundQuota:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Reject thành công
 *       404:
 *         description: Course không tồn tại
 */
router.post('/:courseId/reject', courseController.rejectCourse);

module.exports = router;