const express = require('express');
const router = express.Router();
const planController = require('../controllers/plan.controller');
const { auth, isAdmin } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * /api/v1/plans:
 *   get:
 *     summary: Lấy danh sách gói
 *     description: Lấy danh sách tất cả gói (public API)
 *     tags: [Plans]
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
 *     responses:
 *       200:
 *         description: Lấy danh sách gói thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 plans:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       price:
 *                         type: number
 *                       durationDays:
 *                         type: integer
 *                       leadQuota:
 *                         type: integer
 *                       postQuota:
 *                         type: integer
 *                       description:
 *                         type: string
 *                       createdAt:
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
router.get('/', planController.getAllPlans);

/**
 * @swagger
 * /api/v1/plans/{id}:
 *   get:
 *     summary: Xem chi tiết gói
 *     description: Lấy thông tin chi tiết của một gói (public API)
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của gói
 *     responses:
 *       200:
 *         description: Lấy thông tin gói thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 plan:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     price:
 *                       type: number
 *                     durationDays:
 *                       type: integer
 *                     leadQuota:
 *                       type: integer
 *                     postQuota:
 *                       type: integer
 *                     description:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 *       404:
 *         description: Không tìm thấy gói
 */
router.get('/:id', planController.getPlanById);

/**
 * @swagger
 * /api/v1/plans:
 *   post:
 *     summary: Tạo gói mới (admin)
 *     description: Admin tạo gói mới
 *     tags: [Admin - Plans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - durationDays
 *               - leadQuota
 *               - postQuota
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tên gói
 *                 example: "Gói Cơ Bản"
 *               price:
 *                 type: number
 *                 description: Giá gói
 *                 example: 299000
 *               durationDays:
 *                 type: integer
 *                 description: Số ngày sử dụng
 *                 example: 30
 *               leadQuota:
 *                 type: integer
 *                 description: Số lượng lead được sử dụng
 *                 example: 100
 *               postQuota:
 *                 type: integer
 *                 description: Số lượng post được sử dụng
 *                 example: 50
 *               description:
 *                 type: string
 *                 description: Mô tả gói
 *                 example: "Gói cơ bản cho người mới bắt đầu"
 *     responses:
 *       201:
 *         description: Tạo gói thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Tạo gói thành công"
 *                 plan:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     price:
 *                       type: number
 *       400:
 *         description: Validation error hoặc tên gói đã tồn tại
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 */
router.post('/', 
  auth,
  isAdmin,
  planController.createPlan
);

/**
 * @swagger
 * /api/v1/plans/{id}:
 *   patch:
 *     summary: Cập nhật gói
 *     description: Admin cập nhật thông tin gói
 *     tags: [Admin - Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của gói cần cập nhật
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tên gói
 *               price:
 *                 type: number
 *                 description: Giá gói
 *               durationDays:
 *                 type: integer
 *                 description: Số ngày sử dụng
 *               leadQuota:
 *                 type: integer
 *                 description: Số lượng lead được sử dụng
 *               postQuota:
 *                 type: integer
 *                 description: Số lượng post được sử dụng
 *               description:
 *                 type: string
 *                 description: Mô tả gói
 *     responses:
 *       200:
 *         description: Cập nhật gói thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Cập nhật gói thành công"
 *                 plan:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     price:
 *                       type: number
 *       400:
 *         description: Validation error hoặc tên gói đã tồn tại
 *       404:
 *         description: Không tìm thấy gói
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 */
router.patch('/:id', 
  auth,
  isAdmin,
  planController.updatePlan
);

/**
 * @swagger
 * /api/v1/plans/{id}:
 *   delete:
 *     summary: Xóa gói
 *     description: Admin xóa gói (soft delete)
 *     tags: [Admin - Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của gói cần xóa
 *     responses:
 *       200:
 *         description: Xóa gói thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Xóa gói thành công"
 *       404:
 *         description: Không tìm thấy gói
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 */
router.delete('/:id', 
  auth,
  isAdmin,
  planController.deletePlan
);

module.exports = router;
