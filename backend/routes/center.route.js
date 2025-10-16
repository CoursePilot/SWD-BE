const express = require('express');
const router = express.Router();
const centerController = require('../controllers/center.controller');
const { auth, isAdmin, isAdminOrEmployee } = require('../middlewares/auth.middleware');
const { upload, handleMulterError } = require('../middlewares/upload.middleware');
const { 
  validateCenterRequest, 
  validateCenterUpdate, 
  validateAdminAction, 
  handleValidationErrors 
} = require('../middlewares/center.validator');

// ==================== CENTER REQUESTS (Student) ====================

/**
 * @swagger
 * /api/v1/centers/requests:
 *   post:
 *     summary: Gửi đơn xin làm trung tâm
 *     description: Student gửi đơn xin làm trung tâm với thông tin cần thiết
 *     tags: [Center Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *               - address
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tên trung tâm
 *                 example: "Trung tâm Anh ngữ ABC"
 *               phone:
 *                 type: string
 *                 description: Số điện thoại
 *                 example: "0123456789"
 *               address:
 *                 type: string
 *                 description: Địa chỉ trung tâm
 *                 example: "123 Đường ABC, Quận 1, TP.HCM"
 *               websiteUrl:
 *                 type: string
 *                 description: Website trung tâm (optional)
 *                 example: "https://abc-center.com"
 *               description:
 *                 type: string
 *                 description: Mô tả trung tâm
 *                 example: "Trung tâm chuyên đào tạo tiếng Anh chất lượng cao"
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Logo trung tâm (optional)
 *     responses:
 *       201:
 *         description: Gửi đơn xin thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Đơn xin làm trung tâm đã được gửi thành công"
 *                 request:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: "pending"
 *       400:
 *         description: Validation error hoặc đã có đơn pending
 *       401:
 *         description: Unauthorized
 */
router.post('/requests', 
  auth,
  upload.single('logo'),
  handleMulterError,
  validateCenterRequest,
  handleValidationErrors,
  centerController.submitCenterRequest
);

/**
 * @swagger
 * /api/v1/centers/requests/my:
 *   get:
 *     summary: Lấy đơn xin làm trung tâm của mình
 *     description: Student xem đơn xin làm trung tâm đã gửi
 *     tags: [Center Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy đơn xin thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 request:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     status:
 *                       type: string
 *                     created_at:
 *                       type: string
 *       404:
 *         description: Không tìm thấy đơn xin
 *       401:
 *         description: Unauthorized
 */
router.get('/requests/my', 
  auth,
  centerController.getMyCenterRequest
);

/**
 * @swagger
 * /api/v1/centers/requests/my:
 *   put:
 *     summary: Cập nhật đơn xin làm trung tâm
 *     description: Student cập nhật đơn xin (chỉ khi status = pending)
 *     tags: [Center Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tên trung tâm
 *               phone:
 *                 type: string
 *                 description: Số điện thoại
 *               address:
 *                 type: string
 *                 description: Địa chỉ trung tâm
 *               websiteUrl:
 *                 type: string
 *                 description: Website trung tâm
 *               description:
 *                 type: string
 *                 description: Mô tả trung tâm
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Logo trung tâm
 *     responses:
 *       200:
 *         description: Cập nhật đơn xin thành công
 *       400:
 *         description: Validation error hoặc đơn đã được xử lý
 *       404:
 *         description: Không tìm thấy đơn xin
 *       401:
 *         description: Unauthorized
 */
router.put('/requests/my', 
  auth,
  upload.single('logo'),
  handleMulterError,
  validateCenterUpdate,
  handleValidationErrors,
  centerController.updateCenterRequest
);

/**
 * @swagger
 * /api/v1/centers/requests/my:
 *   delete:
 *     summary: Xóa đơn xin làm trung tâm
 *     description: Student xóa đơn xin (chỉ khi status = pending)
 *     tags: [Center Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Xóa đơn xin thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Xóa đơn xin làm trung tâm thành công"
 *       400:
 *         description: Đơn đã được xử lý, không thể xóa
 *       404:
 *         description: Không tìm thấy đơn xin
 *       401:
 *         description: Unauthorized
 */
router.delete('/requests/my', 
  auth,
  centerController.deleteCenterRequest
);

// ==================== CENTER REQUESTS (Admin) ====================

/**
 * @swagger
 * /api/v1/centers/requests:
 *   get:
 *     summary: Lấy tất cả đơn xin làm trung tâm
 *     description: Admin xem danh sách tất cả đơn xin làm trung tâm
 *     tags: [Admin - Center Management]
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
 *           enum: [pending, approved, rejected]
 *         description: Lọc theo trạng thái
 *     responses:
 *       200:
 *         description: Lấy danh sách đơn xin thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 centers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       status:
 *                         type: string
 *                       userName:
 *                         type: string
 *                       userEmail:
 *                         type: string
 *                       created_at:
 *                         type: string
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
 *       403:
 *         description: Access denied - Admin role required
 */
router.get('/requests', 
  auth,
  isAdmin,
  centerController.getAllCenterRequests
);

/**
 * @swagger
 * /api/v1/centers/requests/{id}:
 *   get:
 *     summary: Lấy đơn xin làm trung tâm theo ID
 *     description: Admin xem chi tiết đơn xin làm trung tâm
 *     tags: [Admin - Center Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của đơn xin
 *     responses:
 *       200:
 *         description: Lấy đơn xin thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 request:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     address:
 *                       type: string
 *                     description:
 *                       type: string
 *                     status:
 *                       type: string
 *                     admin_notes:
 *                       type: string
 *                     userName:
 *                       type: string
 *                     userEmail:
 *                       type: string
 *       404:
 *         description: Không tìm thấy đơn xin
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 */
router.get('/requests/:id', 
  auth,
  isAdmin,
  centerController.getCenterRequestById
);

/**
 * @swagger
 * /api/v1/centers/requests/{id}:
 *   patch:
 *     summary: Cập nhật trạng thái đơn xin làm trung tâm
 *     description: Admin duyệt hoặc từ chối đơn xin làm trung tâm
 *     tags: [Admin - Center Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của đơn xin
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *                 description: Trạng thái mới
 *                 example: "approved"
 *               adminNotes:
 *                 type: string
 *                 description: Ghi chú của admin (optional)
 *                 example: "Đơn xin đã được duyệt, chúc mừng!"
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Duyệt đơn xin làm trung tâm thành công"
 *                 request:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
 *                     admin_notes:
 *                       type: string
 *       400:
 *         description: Validation error hoặc đơn đã được xử lý
 *       404:
 *         description: Không tìm thấy đơn xin
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 */
router.patch('/requests/:id', 
  auth,
  isAdmin,
  validateAdminAction,
  handleValidationErrors,
  centerController.updateCenterRequestStatus
);

// ==================== ADMIN CENTER MANAGEMENT ====================



/**
 * @swagger
 * /api/v1/centers/admin/{id}:
 *   delete:
 *     summary: Admin xóa trung tâm
 *     description: Admin xóa trung tâm (soft delete)
 *     tags: [Admin - Center Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của trung tâm cần xóa
 *     responses:
 *       200:
 *         description: Xóa trung tâm thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Xóa trung tâm thành công"
 *       404:
 *         description: Không tìm thấy trung tâm
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 */
router.delete('/admin/:id', 
  auth,
  isAdmin,
  centerController.deleteCenter
);

// ==================== CENTER MANAGEMENT (Center) ====================

/**
 * @swagger
 * /api/v1/centers/my:
 *   get:
 *     summary: Lấy thông tin trung tâm của mình
 *     description: Center xem thông tin trung tâm của mình
 *     tags: [Center Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thông tin trung tâm thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 center:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     address:
 *                       type: string
 *                     website_url:
 *                       type: string
 *                     description:
 *                       type: string
 *                     logo_url:
 *                       type: string
 *                     status:
 *                       type: string
 *                     verified:
 *                       type: boolean
 *       404:
 *         description: Bạn chưa phải là trung tâm
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Center or Admin role required
 */
router.get('/my', 
  auth,
  isAdminOrEmployee,
  centerController.getMyCenter
);

/**
 * @swagger
 * /api/v1/centers/my:
 *   put:
 *     summary: Cập nhật thông tin trung tâm
 *     description: Center cập nhật thông tin trung tâm của mình
 *     tags: [Center Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tên trung tâm
 *               phone:
 *                 type: string
 *                 description: Số điện thoại
 *               address:
 *                 type: string
 *                 description: Địa chỉ trung tâm
 *               websiteUrl:
 *                 type: string
 *                 description: Website trung tâm
 *               description:
 *                 type: string
 *                 description: Mô tả trung tâm
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Logo trung tâm
 *     responses:
 *       200:
 *         description: Cập nhật thông tin trung tâm thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Cập nhật thông tin trung tâm thành công"
 *                 center:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     status:
 *                       type: string
 *       404:
 *         description: Bạn chưa phải là trung tâm
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Center or Admin role required
 */
router.put('/my', 
  auth,
  isAdminOrEmployee,
  upload.single('logo'),
  handleMulterError,
  validateCenterUpdate,
  handleValidationErrors,
  centerController.updateCenter
);

// ==================== PUBLIC CENTER INFO ====================

/**
 * @swagger
 * /api/v1/centers:
 *   get:
 *     summary: Lấy tất cả trung tâm (Public)
 *     description: Lấy danh sách tất cả trung tâm đã được duyệt (public API)
 *     tags: [Public - Centers]
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
 *           enum: [active, suspended]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: verified
 *         schema:
 *           type: boolean
 *         description: Lọc theo trạng thái xác minh
 *     responses:
 *       200:
 *         description: Lấy danh sách trung tâm thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 centers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       address:
 *                         type: string
 *                       website_url:
 *                         type: string
 *                       description:
 *                         type: string
 *                       logo_url:
 *                         type: string
 *                       status:
 *                         type: string
 *                       verified:
 *                         type: boolean
 *                       userName:
 *                         type: string
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 */
router.get('/', 
  centerController.getAllCenters
);

/**
 * @swagger
 * /api/v1/centers/{id}:
 *   get:
 *     summary: Lấy thông tin trung tâm theo ID (Public)
 *     description: Lấy thông tin chi tiết của một trung tâm (public API)
 *     tags: [Public - Centers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của trung tâm
 *     responses:
 *       200:
 *         description: Lấy thông tin trung tâm thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 center:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     address:
 *                       type: string
 *                     website_url:
 *                       type: string
 *                     description:
 *                       type: string
 *                     logo_url:
 *                       type: string
 *                     status:
 *                       type: string
 *                     verified:
 *                       type: boolean
 *                     created_at:
 *                       type: string
 *       404:
 *         description: Không tìm thấy trung tâm
 */
router.get('/:id', 
  centerController.getCenterById
);

module.exports = router;