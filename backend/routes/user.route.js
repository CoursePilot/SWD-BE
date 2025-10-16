const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { auth, isAdmin } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Lấy tất cả users
 *     description: Admin lấy danh sách tất cả users với phân trang và lọc
 *     tags: [User Management]
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
 *         name: role
 *         schema:
 *           type: integer
 *           enum: [1, 2, 3]
 *         description: "Lọc theo role (1: student, 2: center, 3: admin)"
 *       - in: query
 *         name: emailVerified
 *         schema:
 *           type: boolean
 *         description: Lọc theo trạng thái xác minh email
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên hoặc email
 *     responses:
 *       200:
 *         description: Lấy danh sách users thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       avatarUrl:
 *                         type: string
 *                       role:
 *                         type: integer
 *                       emailVerified:
 *                         type: integer
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 */
router.get('/', 
  auth,
  isAdmin,
  userController.getAllUsers
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Xóa user
 *     description: Admin xóa user (soft delete)
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của user cần xóa
 *     responses:
 *       200:
 *         description: Xóa user thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Xóa user thành công"
 *       400:
 *         description: Không thể xóa chính mình
 *       404:
 *         description: Không tìm thấy user
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 */
router.delete('/:id', 
  auth,
  isAdmin,
  userController.deleteUser
);

module.exports = router;
