const express = require('express');
const router = express.Router();
const followController = require('../controllers/follow.controller');
const { auth } = require('../middlewares/auth.middleware');
const { 
  validateFollowCourse,
  validateFollowCenter,
  validateUUIDParam,
  validatePaginationQuery,
  validateTopCoursesQuery,
  validateRecentFollowsQuery,
  validateCheckFollowQuery,
  validateCheckFollowCenterQuery,
  handleValidationErrors 
} = require('../middlewares/follow.validator');

/**
 * @swagger
 * components:
 *   schemas:
 *     Follow:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID của follow
 *         userId:
 *           type: string
 *           format: uuid
 *           description: ID của người dùng
 *         courseId:
 *           type: string
 *           format: uuid
 *           description: ID của khóa học
 *         followedAt:
 *           type: string
 *           format: date-time
 *           description: Thời gian bắt đầu theo dõi
 *         userName:
 *           type: string
 *           description: Tên người dùng
 *         userEmail:
 *           type: string
 *           description: Email người dùng
 *         courseTitle:
 *           type: string
 *           description: Tên khóa học
 *         courseSummary:
 *           type: string
 *           description: Tóm tắt khóa học
 *         centerName:
 *           type: string
 *           description: Tên trung tâm
 *       example:
 *         id: "550e8400-e29b-41d4-a716-446655440000"
 *         userId: "123e4567-e89b-12d3-a456-426614174000"
 *         courseId: "cf39157-c67c-42cf-873f-b7c30fca6efa"
 *         followedAt: "2025-01-15T10:30:00Z"
 *         userName: "Nguyễn Văn A"
 *         userEmail: "nguyenvana@email.com"
 *         courseTitle: "Khóa học IELTS 7.0+"
 *         courseSummary: "Khóa học IELTS toàn diện"
 *         centerName: "Trung tâm ABC"
 * 
 *     FollowRequest:
 *       type: object
 *       required:
 *         - userId
 *         - courseId
 *       properties:
 *         userId:
 *           type: string
 *           format: uuid
 *           description: ID của người dùng
 *         courseId:
 *           type: string
 *           format: uuid
 *           description: ID của khóa học
 *       example:
 *         userId: "123e4567-e89b-12d3-a456-426614174000"
 *         courseId: "cf39157-c67c-42cf-873f-b7c30fca6efa"
 * 
 *     FollowedCourse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         courseId:
 *           type: string
 *           format: uuid
 *         followedAt:
 *           type: string
 *           format: date-time
 *         courseTitle:
 *           type: string
 *         courseSummary:
 *           type: string
 *         priceMin:
 *           type: number
 *         priceMax:
 *           type: number
 *         modality:
 *           type: string
 *           enum: [online, offline, blended]
 *         courseStatus:
 *           type: string
 *           enum: [draft, submitted, approved, rejected]
 *         centerName:
 *           type: string
 *         centerLogo:
 *           type: string
 * 
 *     TopFollowedCourse:
 *       type: object
 *       properties:
 *         courseId:
 *           type: string
 *           format: uuid
 *         courseTitle:
 *           type: string
 *         courseSummary:
 *           type: string
 *         priceMin:
 *           type: number
 *         priceMax:
 *           type: number
 *         centerName:
 *           type: string
 *         followCount:
 *           type: integer
 *           description: Số lượng người theo dõi
 * 
 *   tags:
 *     - name: Follows
 *       description: API quản lý theo dõi khóa học
 */

/**
 * @swagger
 * /api/v1/follows:
 *   post:
 *     summary: Theo dõi khóa học
 *     description: Người dùng theo dõi một khóa học
 *     tags: [Follows]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FollowRequest'
 *     responses:
 *       201:
 *         description: Theo dõi khóa học thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 follow:
 *                   $ref: '#/components/schemas/Follow'
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc đã theo dõi rồi
 *       404:
 *         description: Người dùng hoặc khóa học không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.post('/', 
  validateFollowCourse,
  handleValidationErrors,
  followController.followCourse
);

/**
 * @swagger
 * /api/v1/follows:
 *   delete:
 *     summary: Bỏ theo dõi khóa học
 *     description: Người dùng bỏ theo dõi một khóa học
 *     tags: [Follows]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FollowRequest'
 *     responses:
 *       200:
 *         description: Bỏ theo dõi khóa học thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc chưa theo dõi
 *       500:
 *         description: Lỗi server
 */
router.delete('/', 
  validateFollowCourse,
  handleValidationErrors,
  followController.unfollowCourse
);

/**
 * @swagger
 * /api/v1/follows/center:
 *   post:
 *     summary: Theo dõi trung tâm
 *     description: Người dùng theo dõi một trung tâm
 *     tags: [Follows]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - centerId
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: ID của người dùng
 *               centerId:
 *                 type: string
 *                 format: uuid
 *                 description: ID của trung tâm
 *     responses:
 *       201:
 *         description: Theo dõi trung tâm thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc đã theo dõi trung tâm này rồi
 *       404:
 *         description: Người dùng hoặc trung tâm không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.post('/center', 
  validateFollowCenter,
  handleValidationErrors,
  followController.followCenter
);

/**
 * @swagger
 * /api/v1/follows/center:
 *   delete:
 *     summary: Bỏ theo dõi trung tâm
 *     description: Người dùng bỏ theo dõi một trung tâm
 *     tags: [Follows]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - centerId
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: ID của người dùng
 *               centerId:
 *                 type: string
 *                 format: uuid
 *                 description: ID của trung tâm
 *     responses:
 *       200:
 *         description: Bỏ theo dõi trung tâm thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       500:
 *         description: Lỗi server
 */
router.delete('/center', 
  validateFollowCenter,
  handleValidationErrors,
  followController.unfollowCenter
);

/**
 * @swagger
 * /api/v1/follows/center/check:
 *   get:
 *     summary: Kiểm tra trạng thái theo dõi trung tâm
 *     description: Kiểm tra người dùng có đang theo dõi trung tâm không
 *     tags: [Follows]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của người dùng
 *       - in: query
 *         name: centerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của trung tâm
 *     responses:
 *       200:
 *         description: Kiểm tra trạng thái theo dõi trung tâm thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       500:
 *         description: Lỗi server
 */
router.get('/center/check', 
  validateCheckFollowCenterQuery,
  handleValidationErrors,
  followController.checkFollowCenterStatus
);

/**
 * @swagger
 * /api/v1/follows/check:
 *   get:
 *     summary: Kiểm tra trạng thái theo dõi
 *     description: Kiểm tra người dùng có đang theo dõi khóa học không
 *     tags: [Follows]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của người dùng
 *       - in: query
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của khóa học
 *     responses:
 *       200:
 *         description: Kiểm tra trạng thái theo dõi thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 isFollowing:
 *                   type: boolean
 *                 userId:
 *                   type: string
 *                 courseId:
 *                   type: string
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       500:
 *         description: Lỗi server
 */
router.get('/check', 
  validateCheckFollowQuery,
  handleValidationErrors,
  followController.checkFollowStatus
);

/**
 * @swagger
 * /api/v1/follows/top-courses:
 *   get:
 *     summary: Lấy top khóa học được theo dõi nhiều nhất
 *     description: Lấy danh sách khóa học được theo dõi nhiều nhất
 *     tags: [Follows]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Số lượng khóa học trả về
 *     responses:
 *       200:
 *         description: Lấy top khóa học thành công
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
 *                     $ref: '#/components/schemas/TopFollowedCourse'
 *       500:
 *         description: Lỗi server
 */
router.get('/top-courses', 
  validateTopCoursesQuery,
  handleValidationErrors,
  followController.getTopFollowedCourses
);

/**
 * @swagger
 * /api/v1/follows/recent:
 *   get:
 *     summary: Lấy danh sách theo dõi mới nhất
 *     description: Lấy danh sách các lượt theo dõi mới nhất
 *     tags: [Follows]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Số lượng follow trả về
 *     responses:
 *       200:
 *         description: Lấy danh sách theo dõi mới nhất thành công
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
 *                     $ref: '#/components/schemas/Follow'
 *       500:
 *         description: Lỗi server
 */
router.get('/recent', 
  validateRecentFollowsQuery,
  handleValidationErrors,
  followController.getRecentFollows
);

/**
 * @swagger
 * /api/v1/follows/stats:
 *   get:
 *     summary: Lấy thống kê theo dõi
 *     description: Lấy thống kê theo dõi của người dùng hoặc khóa học
 *     tags: [Follows]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của người dùng (để xem số khóa học đang theo dõi)
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của khóa học (để xem số người theo dõi)
 *     responses:
 *       200:
 *         description: Lấy thống kê thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 stats:
 *                   type: object
 *       404:
 *         description: Người dùng hoặc khóa học không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.get('/stats', followController.getFollowStats);

/**
 * @swagger
 * /api/v1/follows/my:
 *   get:
 *     summary: Lấy danh sách khóa học tôi đang theo dõi
 *     description: Lấy danh sách khóa học mà user hiện tại (đã đăng nhập) đang theo dõi với tính năng tìm kiếm và filter
 *     tags: [Follows]
 *     security:
 *       - bearerAuth: []
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
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên hoặc mô tả khóa học
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, submitted, approved, rejected]
 *         description: Lọc theo trạng thái khóa học
 *       - in: query
 *         name: modality
 *         schema:
 *           type: string
 *           enum: [online, offline, hybrid]
 *         description: Lọc theo hình thức học
 *       - in: query
 *         name: centerId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lọc theo trung tâm
 *     responses:
 *       200:
 *         description: Lấy danh sách khóa học đang theo dõi thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 userId:
 *                   type: string
 *                 filters:
 *                   type: object
 *                   nullable: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FollowedCourse'
 *                 pagination:
 *                   type: object
 *       401:
 *         description: Chưa đăng nhập
 *       500:
 *         description: Lỗi server
 */
router.get('/my',
  auth,
  validatePaginationQuery,
  handleValidationErrors,
  followController.getMyFollowedCourses
);

/**
 * @swagger
 * /api/v1/follows/user/{userId}:
 *   get:
 *     summary: Lấy danh sách khóa học user đang theo dõi
 *     description: Lấy danh sách khóa học mà người dùng đang theo dõi
 *     tags: [Follows]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của người dùng
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
 *     responses:
 *       200:
 *         description: Lấy danh sách khóa học đang theo dõi thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 userId:
 *                   type: string
 *                 userName:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FollowedCourse'
 *                 pagination:
 *                   type: object
 *       404:
 *         description: Người dùng không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.get('/user/:userId', 
  validateUUIDParam('userId'),
  validatePaginationQuery,
  handleValidationErrors,
  followController.getUserFollowedCourses
);

/**
 * @swagger
 * /api/v1/follows/course/{courseId}:
 *   get:
 *     summary: Lấy danh sách người theo dõi khóa học
 *     description: Lấy danh sách người dùng đang theo dõi khóa học
 *     tags: [Follows]
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
 *     responses:
 *       200:
 *         description: Lấy danh sách người theo dõi thành công
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
 *                       userId:
 *                         type: string
 *                       followedAt:
 *                         type: string
 *                       userName:
 *                         type: string
 *                       userEmail:
 *                         type: string
 *                       userAvatar:
 *                         type: string
 *                 pagination:
 *                   type: object
 *       404:
 *         description: Khóa học không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.get('/course/:courseId', 
  validateUUIDParam('courseId'),
  validatePaginationQuery,
  handleValidationErrors,
  followController.getCourseFollowers
);

/**
 * @swagger
 * /api/v1/follows/center/{centerId}:
 *   get:
 *     summary: Lấy danh sách người theo dõi trung tâm
 *     description: Lấy danh sách người dùng đang theo dõi một trung tâm cụ thể với pagination
 *     tags: [Follows]
 *     parameters:
 *       - in: path
 *         name: centerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của trung tâm
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
 *         description: Số lượng kết quả mỗi trang
 *     responses:
 *       200:
 *         description: Lấy danh sách người theo dõi trung tâm thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 centerId:
 *                   type: string
 *                 centerName:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       userId:
 *                         type: string
 *                       followedAt:
 *                         type: string
 *                       userName:
 *                         type: string
 *                       userEmail:
 *                         type: string
 *                       userAvatar:
 *                         type: string
 *                 pagination:
 *                   type: object
 *       404:
 *         description: Trung tâm không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.get('/center/:centerId', 
  validateUUIDParam('centerId'),
  validatePaginationQuery,
  handleValidationErrors,
  followController.getCenterFollowers
);

module.exports = router;