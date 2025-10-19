const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { auth, isAdmin } = require('../middlewares/auth.middleware');
const { 
  validateCreateCategory, 
  validateUpdateCategory, 
  validateUUIDParam,
  handleValidationErrors 
} = require('../middlewares/category.validator');

// ==================== PUBLIC ROUTES ====================

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID danh mục
 *         name:
 *           type: string
 *           description: Tên danh mục
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Thời gian tạo
 *     CategoryWithCourseCount:
 *       allOf:
 *         - $ref: '#/components/schemas/Category'
 *         - type: object
 *           properties:
 *             courseCount:
 *               type: integer
 *               description: Số lượng khóa học trong danh mục
 */

/**
 * @swagger
 * /api/v1/categories:
 *   get:
 *     summary: Lấy danh sách tất cả danh mục
 *     description: Lấy danh sách danh mục với pagination và search (public)
 *     tags: [Categories]
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
 *           default: 50
 *         description: Số lượng danh mục mỗi trang
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên danh mục
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
 *                     $ref: '#/components/schemas/Category'
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
router.get('/', categoryController.getAllCategories);

/**
 * @swagger
 * /api/v1/categories/simple:
 *   get:
 *     summary: Lấy danh sách danh mục đơn giản
 *     description: Lấy danh sách danh mục không phân trang (dùng cho dropdown, select)
 *     tags: [Categories]
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
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 */
router.get('/simple', categoryController.getCategoriesSimple);

/**
 * @swagger
 * /api/v1/categories/with-courses:
 *   get:
 *     summary: Lấy danh mục có khóa học
 *     description: Lấy danh sách danh mục có ít nhất một khóa học (dùng cho filter)
 *     tags: [Categories]
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
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       courseCount:
 *                         type: integer
 */
router.get('/with-courses', categoryController.getCategoriesWithCourses);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   get:
 *     summary: Lấy thông tin danh mục theo ID
 *     description: Lấy thông tin chi tiết của một danh mục kèm số lượng khóa học
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID danh mục
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
 *                 category:
 *                   $ref: '#/components/schemas/CategoryWithCourseCount'
 *       404:
 *         description: Danh mục không tồn tại
 */
router.get('/:id', categoryController.getCategoryById);

// ==================== ADMIN ONLY ROUTES ====================

/**
 * @swagger
 * /api/v1/categories:
 *   post:
 *     summary: Tạo danh mục mới
 *     description: Tạo danh mục mới (public - không cần auth)
 *     tags: [Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Tên danh mục
 *                 example: "Lập trình"
 *     responses:
 *       201:
 *         description: Tạo danh mục thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 category:
 *                   $ref: '#/components/schemas/Category'
 *       400:
 *         description: Validation error hoặc tên danh mục đã tồn tại
 *       500:
 *         description: Lỗi server
 */
router.post('/', 

  validateCreateCategory,
  handleValidationErrors,
  categoryController.createCategory
);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   put:
 *     summary: Cập nhật danh mục
 *     description: Cập nhật thông tin danh mục (public - không cần auth)
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID danh mục
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Tên danh mục mới
 *                 example: "Thiết kế"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 category:
 *                   $ref: '#/components/schemas/Category'
 *       400:
 *         description: Validation error hoặc tên danh mục đã tồn tại
 *       404:
 *         description: Danh mục không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.put('/:id', 

  validateUpdateCategory,
  handleValidationErrors,
  categoryController.updateCategory
);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   delete:
 *     summary: Xóa danh mục
 *     description: Xóa danh mục (public - không cần auth). Không thể xóa nếu có khóa học đang sử dụng.
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID danh mục
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       400:
 *         description: Không thể xóa danh mục đang được sử dụng
 *       404:
 *         description: Danh mục không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.delete('/:id', 

  categoryController.deleteCategory
);

module.exports = router;