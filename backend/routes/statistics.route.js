const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statistics.controller');
const { auth } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Statistics
 *   description: API thống kê hệ thống
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SystemStats:
 *       type: object
 *       properties:
 *         totalStudents:
 *           type: integer
 *           description: Tổng số học viên (users không phải center)
 *         totalOpenCourses:
 *           type: integer
 *           description: Tổng số khóa học đang mở (approved)
 *         totalCenters:
 *           type: integer
 *           description: Tổng số trung tâm (approved)
 *       example:
 *         totalStudents: 150
 *         totalOpenCourses: 45
 *         totalCenters: 12
 */

/**
 * @swagger
 * /api/v1/statistics/system:
 *   get:
 *     summary: Lấy thống kê tổng quan hệ thống
 *     description: Lấy số lượng students, courses đang open, và centers trong hệ thống
 *     tags: [Statistics]
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
 *                   $ref: '#/components/schemas/SystemStats'
 *       500:
 *         description: Lỗi server
 */
router.get('/system', statisticsController.getSystemStats);

/**
 * @swagger
 * /api/v1/statistics/dashboard:
 *   get:
 *     summary: Lấy thống kê dashboard chi tiết
 *     description: Lấy thống kê tổng quan và các metrics khác cho dashboard (có thể mở rộng)
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: Lấy thống kê dashboard thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 dashboard:
 *                   type: object
 *                   properties:
 *                     overview:
 *                       $ref: '#/components/schemas/SystemStats'
 *       500:
 *         description: Lỗi server
 */
router.get('/dashboard', statisticsController.getDashboardStats);

/**
 * @swagger
 * /api/v1/statistics/top-courses:
 *   get:
 *     summary: Lấy top khóa học được đăng ký nhiều nhất
 *     description: Lấy danh sách các khóa học có số lượng leads (đăng ký) cao nhất
 *     tags: [Statistics]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng khóa học muốn lấy
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
 *                 topCourses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       summary:
 *                         type: string
 *                       imageUrl:
 *                         type: string
 *                       priceMin:
 *                         type: number
 *                       priceMax:
 *                         type: number
 *                       modality:
 *                         type: string
 *                       centerName:
 *                         type: string
 *                       centerLogo:
 *                         type: string
 *                       totalLeads:
 *                         type: integer
 *                         description: Tổng số lượng leads (đăng ký)
 *       500:
 *         description: Lỗi server
 */
router.get('/top-courses', statisticsController.getTopCourses);

/**
 * @swagger
 * /api/v1/statistics/top-centers:
 *   get:
 *     summary: Lấy top trung tâm được follow nhiều nhất
 *     description: Lấy danh sách các trung tâm có số lượng follows cao nhất
 *     tags: [Statistics]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng trung tâm muốn lấy
 *     responses:
 *       200:
 *         description: Lấy top trung tâm thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 topCenters:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       logoUrl:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       address:
 *                         type: string
 *                       websiteUrl:
 *                         type: string
 *                       description:
 *                         type: string
 *                       verified:
 *                         type: boolean
 *                       userName:
 *                         type: string
 *                       totalFollows:
 *                         type: integer
 *       500:
 *         description: Lỗi server
 */
router.get('/top-centers', statisticsController.getTopCenters);

/**
 * @swagger
 * /api/v1/statistics/revenue-by-month:
 *   get:
 *     summary: Thống kê doanh thu theo tháng
 *     description: Lấy thống kê doanh thu từ subscriptions theo từng tháng trong năm
 *     tags: [Statistics]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           default: 2025
 *         description: Năm cần thống kê (mặc định là năm hiện tại)
 *     responses:
 *       200:
 *         description: Lấy thống kê doanh thu thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 year:
 *                   type: integer
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalRevenue:
 *                       type: number
 *                       description: Tổng doanh thu cả năm
 *                     totalSubscriptions:
 *                       type: integer
 *                       description: Tổng số subscriptions
 *                 monthlyData:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       month:
 *                         type: integer
 *                         description: Tháng (1-12)
 *                       totalSubscriptions:
 *                         type: integer
 *                         description: Số lượng subscriptions trong tháng
 *                       totalRevenue:
 *                         type: number
 *                         description: Doanh thu trong tháng
 *       500:
 *         description: Lỗi server
 */
router.get('/revenue-by-month', statisticsController.getRevenueByMonth);

/**
 * @swagger
 * /api/v1/statistics/users-by-month:
 *   get:
 *     summary: Thống kê số lượng user đăng ký theo tháng
 *     description: Lấy thống kê số lượng user mới đăng ký theo từng tháng trong năm
 *     tags: [Statistics]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           default: 2025
 *         description: Năm cần thống kê (mặc định là năm hiện tại)
 *     responses:
 *       200:
 *         description: Lấy thống kê user thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 year:
 *                   type: integer
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                       description: Tổng số user đăng ký trong năm
 *                 monthlyData:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       month:
 *                         type: integer
 *                         description: Tháng (1-12)
 *                       totalUsers:
 *                         type: integer
 *                         description: Số lượng user đăng ký trong tháng
 *       500:
 *         description: Lỗi server
 */
router.get('/users-by-month', statisticsController.getUsersByMonth);

module.exports = router;
