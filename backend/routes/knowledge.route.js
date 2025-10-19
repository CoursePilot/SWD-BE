const express = require('express');
const router = express.Router();
const knowledgeController = require('../controllers/knowledgeController');

/**
 * @swagger
 * tags:
 *   name: Knowledge
 *   description: Quản lý cơ sở tri thức (Knowledge Base - Supabase RAG)
 */

/**
 * @swagger
 * /api/v1/knowledge:
 *   post:
 *     summary: Thêm tri thức mới vào Knowledge Base
 *     tags: [Knowledge]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               source_type:
 *                 type: string
 *                 example: "course"
 *               source_id:
 *                 type: string
 *                 example: "IELTS101"
 *               title:
 *                 type: string
 *                 example: "Khóa IELTS Intensive"
 *               content:
 *                 type: string
 *                 example: "Khóa học IELTS Intensive giúp học viên đạt band 7.0..."
 *               metadata:
 *                 type: object
 *                 example: { center_id: "C001", level: "advanced" }
 *     responses:
 *       200:
 *         description: Thêm tri thức thành công
 */
router.post('/', knowledgeController.addKnowledge);

/**
 * @swagger
 * /api/v1/knowledge/bulk:
 *   post:
 *     summary: Thêm nhiều tri thức cùng lúc
 *     tags: [Knowledge]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     content:
 *                       type: string
 *     responses:
 *       200:
 *         description: Kết quả thêm nhiều tri thức
 */
router.post('/bulk', knowledgeController.bulkAddKnowledge);

/**
 * @swagger
 * /api/v1/knowledge/search:
 *   post:
 *     summary: Tìm kiếm tri thức bằng vector embedding
 *     tags: [Knowledge]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 example: "Tôi muốn học khóa IELTS cho người mới bắt đầu"
 *               limit:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       200:
 *         description: Trả về danh sách tri thức tương tự
 */
router.post('/search', knowledgeController.searchKnowledge);

/**
 * @swagger
 * /api/v1/knowledge:
 *   get:
 *     summary: Lấy danh sách tri thức
 *     tags: [Knowledge]
 *     parameters:
 *       - in: query
 *         name: source_type
 *         schema:
 *           type: string
 *         description: "Lọc theo loại nguồn (vd: course, faq, policy)"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lấy danh sách tri thức thành công
 */
router.get('/', knowledgeController.getKnowledgeList);

/**
 * @swagger
 * /api/v1/knowledge/{id}:
 *   delete:
 *     summary: Xóa tri thức theo ID
 *     tags: [Knowledge]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Đã xóa tri thức
 */
router.delete('/:id', knowledgeController.deleteKnowledge);

module.exports = router;