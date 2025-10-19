const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Quản lý hội thoại chatbot (sessions & messages)
 */

/**
 * @swagger
 * /api/v1/chat/sessions:
 *   post:
 *     summary: Tạo session chat mới
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: string
 *                 description: ID người dùng
 *               context:
 *                 type: object
 *                 description: Thông tin ngữ cảnh ban đầu (nếu có)
 *     responses:
 *       200:
 *         description: Tạo session thành công
 */
router.post('/sessions', chatController.createSession);

/**
 * @swagger
 * /api/v1/chat/messages:
 *   post:
 *     summary: Gửi tin nhắn mới & nhận phản hồi từ chatbot (RAG)
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               session_id:
 *                 type: string
 *               message_text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Nhận phản hồi từ chatbot
 */
router.post('/messages', chatController.sendMessage);

/**
 * @swagger
 * /api/v1/chat/sessions/{session_id}/messages:
 *   get:
 *     summary: Lấy lịch sử tin nhắn trong 1 session
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lấy danh sách tin nhắn thành công
 */
router.get('/sessions/:session_id/messages', chatController.getSessionHistory);

/**
 * @swagger
 * /api/v1/chat/users/{user_id}/sessions:
 *   get:
 *     summary: Lấy danh sách session của 1 user
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lấy danh sách session thành công
 */
router.get('/users/:user_id/sessions', chatController.getUserSessions);

/**
 * @swagger
 * /api/v1/chat/sessions/{session_id}/end:
 *   put:
 *     summary: Kết thúc session chat
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Đã kết thúc session
 */
router.put('/sessions/:session_id/end', chatController.endSession);

module.exports = router;