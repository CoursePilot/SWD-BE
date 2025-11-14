const User = require('../models/user.model');
const Course = require('../models/course.model');
const Center = require('../models/center.model');
const Subscription = require('../models/subscription.model');

module.exports = {
  getSystemStats,
  getDashboardStats,
  getTopCourses,
  getTopCenters,
  getRevenueByMonth,
  getUsersByMonth
};

// Lấy thống kê tổng quan hệ thống
async function getSystemStats(req, res) {
  try {
    // Đếm số lượng students (users không phải center - role = 1)
    const totalStudents = await User.countStudents();
    
    // Đếm số lượng courses đang open (approved)
    const totalOpenCourses = await Course.countOpenCourses();
    
    // Đếm số lượng centers (approved)
    const totalCenters = await Center.countAllCenters();

    res.json({
      message: "Lấy thống kê hệ thống thành công",
      stats: {
        totalStudents,
        totalOpenCourses,
        totalCenters
      }
    });

  } catch (error) {
    console.error("Get system stats error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy thống kê hệ thống"
    });
  }
}

// Lấy thống kê chi tiết cho dashboard (có thể mở rộng thêm)
async function getDashboardStats(req, res) {
  try {
    const totalStudents = await User.countStudents();
    const totalOpenCourses = await Course.countOpenCourses();
    const totalCenters = await Center.countAllCenters();

    // Có thể thêm các thống kê khác như:
    // - Số lượng courses theo category
    // - Số lượng leads
    // - Revenue
    // - Top centers
    // etc.

    res.json({
      message: "Lấy thống kê dashboard thành công",
      dashboard: {
        overview: {
          totalStudents,
          totalOpenCourses,
          totalCenters
        },
        // Có thể thêm sections khác ở đây
        // trends: {...},
        // topCenters: [...],
        // recentActivities: [...]
      }
    });

  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy thống kê dashboard"
    });
  }
}

// Lấy top khóa học được đăng ký nhiều nhất
async function getTopCourses(req, res) {
  try {
    const { limit = 10 } = req.query;
    
    const topCourses = await Course.getTopCoursesBySubscriptions(parseInt(limit));

    res.json({
      message: "Lấy top khóa học thành công",
      topCourses
    });

  } catch (error) {
    console.error("Get top courses error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy top khóa học"
    });
  }
}

// Lấy top trung tâm được follow nhiều nhất
async function getTopCenters(req, res) {
  try {
    const { limit = 10 } = req.query;
    
    const topCenters = await Center.getTopCentersByFollows(parseInt(limit));

    res.json({
      message: "Lấy top trung tâm thành công",
      topCenters
    });

  } catch (error) {
    console.error("Get top centers error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy top trung tâm"
    });
  }
}

// Thống kê doanh thu theo tháng
async function getRevenueByMonth(req, res) {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    const revenueData = await Subscription.getRevenueByMonth(parseInt(year));
    
    // Tính tổng
    const totalRevenue = revenueData.reduce((sum, item) => sum + item.totalRevenue, 0);
    const totalSubscriptions = revenueData.reduce((sum, item) => sum + item.totalSubscriptions, 0);

    res.json({
      message: "Lấy thống kê doanh thu theo tháng thành công",
      year: parseInt(year),
      summary: {
        totalRevenue,
        totalSubscriptions
      },
      monthlyData: revenueData
    });

  } catch (error) {
    console.error("Get revenue by month error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy thống kê doanh thu"
    });
  }
}

// Thống kê số lượng user đăng ký theo tháng
async function getUsersByMonth(req, res) {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    const userData = await User.getUserRegistrationByMonth(parseInt(year));
    
    // Tính tổng
    const totalUsers = userData.reduce((sum, item) => sum + item.totalUsers, 0);

    res.json({
      message: "Lấy thống kê user đăng ký theo tháng thành công",
      year: parseInt(year),
      summary: {
        totalUsers
      },
      monthlyData: userData
    });

  } catch (error) {
    console.error("Get users by month error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy thống kê user"
    });
  }
}
