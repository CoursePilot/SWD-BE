const { validationResult } = require('express-validator');
const Follow = require('../models/follow.model');
const Course = require('../models/course.model');
const Center = require('../models/center.model');
const User = require('../models/user.model');

module.exports = {
  followCourse,
  unfollowCourse,
  followCenter,
  unfollowCenter,
  checkFollowStatus,
  checkFollowCenterStatus,
  getUserFollowedCourses,
  getMyFollowedCourses,
  getCourseFollowers,
  getCenterFollowers,
  getTopFollowedCourses,
  getRecentFollows,
  getFollowStats
};

// Theo dõi khóa học
async function followCourse(req, res) {
  try {
    // Kiểm tra validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Dữ liệu không hợp lệ",
        details: errors.array()
      });
    }

    const { userId, courseId } = req.body;

    // Kiểm tra user có tồn tại không
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: "Người dùng không tồn tại"
      });
    }

    // Kiểm tra course có tồn tại không
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        error: "Khóa học không tồn tại"
      });
    }

    // Kiểm tra đã follow chưa
    const isAlreadyFollowing = await Follow.isFollowing(userId, courseId);
    if (isAlreadyFollowing) {
      return res.status(400).json({
        error: "Bạn đã theo dõi khóa học này rồi"
      });
    }

    const followId = await Follow.create({ userId, courseId });
    const follow = await Follow.findById(followId);

    res.status(201).json({
      message: "Theo dõi khóa học thành công",
      follow
    });

  } catch (error) {
    console.error("Follow course error:", error);
    res.status(500).json({
      error: "Lỗi server khi theo dõi khóa học"
    });
  }
}

// Bỏ theo dõi khóa học
async function unfollowCourse(req, res) {
  try {
    // Kiểm tra validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Dữ liệu không hợp lệ",
        details: errors.array()
      });
    }

    const { userId, courseId } = req.body;

    // Kiểm tra có đang follow không
    const isFollowing = await Follow.isFollowing(userId, courseId);
    if (!isFollowing) {
      return res.status(400).json({
        error: "Bạn chưa theo dõi khóa học này"
      });
    }

    const unfollowed = await Follow.deleteByUserAndCourse(userId, courseId);
    if (!unfollowed) {
      return res.status(500).json({
        error: "Không thể bỏ theo dõi khóa học"
      });
    }

    res.json({
      message: "Bỏ theo dõi khóa học thành công"
    });

  } catch (error) {
    console.error("Unfollow course error:", error);
    res.status(500).json({
      error: "Lỗi server khi bỏ theo dõi khóa học"
    });
  }
}

// Theo dõi trung tâm
async function followCenter(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Dữ liệu không hợp lệ",
        details: errors.array()
      });
    }

    const { userId, centerId } = req.body;

    // Kiểm tra user có tồn tại không
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: "Người dùng không tồn tại"
      });
    }

    // Kiểm tra center có tồn tại không
    const center = await Center.findById(centerId);
    if (!center) {
      return res.status(404).json({
        error: "Trung tâm không tồn tại"
      });
    }

    // Kiểm tra đã follow chưa
    const isAlreadyFollowing = await Follow.isFollowingCenter(userId, centerId);
    if (isAlreadyFollowing) {
      return res.status(400).json({
        error: "Bạn đã theo dõi trung tâm này rồi"
      });
    }

    const followId = await Follow.create({ userId, centerId });
    const follow = await Follow.findById(followId);

    res.status(201).json({
      message: "Theo dõi trung tâm thành công",
      follow,
      center: {
        id: center.id,
        name: center.name,
        logo_url: center.logo_url
      }
    });

  } catch (error) {
    console.error("Follow center error:", error);
    res.status(500).json({
      error: "Lỗi server khi theo dõi trung tâm"
    });
  }
}

// Bỏ theo dõi trung tâm
async function unfollowCenter(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Dữ liệu không hợp lệ",
        details: errors.array()
      });
    }

    const { userId, centerId } = req.body;

    const unfollowed = await Follow.deleteByUserAndCenter(userId, centerId);

    if (!unfollowed) {
      return res.status(500).json({
        error: "Không thể bỏ theo dõi trung tâm"
      });
    }

    res.json({
      message: "Bỏ theo dõi trung tâm thành công"
    });

  } catch (error) {
    console.error("Unfollow center error:", error);
    res.status(500).json({
      error: "Lỗi server khi bỏ theo dõi trung tâm"
    });
  }
}

// Kiểm tra trạng thái follow
async function checkFollowStatus(req, res) {
  try {
    // Kiểm tra validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Dữ liệu không hợp lệ",
        details: errors.array()
      });
    }

    const { userId, courseId } = req.query;

    const isFollowing = await Follow.isFollowing(userId, courseId);

    res.json({
      message: "Kiểm tra trạng thái theo dõi thành công",
      isFollowing,
      userId,
      courseId
    });

  } catch (error) {
    console.error("Check follow status error:", error);
    res.status(500).json({
      error: "Lỗi server khi kiểm tra trạng thái theo dõi"
    });
  }
}

// Kiểm tra trạng thái follow center
async function checkFollowCenterStatus(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Dữ liệu không hợp lệ",
        details: errors.array()
      });
    }

    const { userId, centerId } = req.query;

    const isFollowing = await Follow.isFollowingCenter(userId, centerId);

    res.json({
      message: "Kiểm tra trạng thái theo dõi trung tâm thành công",
      isFollowing,
      userId,
      centerId
    });

  } catch (error) {
    console.error("Check follow center status error:", error);
    res.status(500).json({
      error: "Lỗi server khi kiểm tra trạng thái theo dõi trung tâm"
    });
  }
}

// Lấy danh sách khóa học user đang follow
async function getUserFollowedCourses(req, res) {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Kiểm tra user có tồn tại không
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: "Người dùng không tồn tại"
      });
    }

    const result = await Follow.findByUserId(userId, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      message: "Lấy danh sách khóa học đang theo dõi thành công",
      userId,
      userName: user.name,
      ...result
    });

  } catch (error) {
    console.error("Get user followed courses error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy danh sách khóa học đang theo dõi"
    });
  }
}

// Lấy danh sách khóa học của user hiện tại đang follow
async function getMyFollowedCourses(req, res) {
  try {
    const userId = req.user.id; // Từ JWT token
    const { page = 1, limit = 10, keyword, status, modality, centerId } = req.query;

    // Nếu có filter, dùng search function
    const hasFilter = keyword || status || modality || centerId;
    
    const result = hasFilter 
      ? await Follow.searchByUserId(userId, {
          page: parseInt(page),
          limit: parseInt(limit),
          keyword,
          status,
          modality,
          centerId
        })
      : await Follow.findByUserId(userId, {
          page: parseInt(page),
          limit: parseInt(limit)
        });

    res.json({
      message: "Lấy danh sách khóa học đang theo dõi thành công",
      userId,
      filters: hasFilter ? { keyword, status, modality, centerId } : null,
      ...result
    });

  } catch (error) {
    console.error("Get my followed courses error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy danh sách khóa học đang theo dõi"
    });
  }
}

// Lấy danh sách user đang follow course
async function getCourseFollowers(req, res) {
  try {
    const { courseId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Kiểm tra course có tồn tại không
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        error: "Khóa học không tồn tại"
      });
    }

    const result = await Follow.findByCourseId(courseId, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      message: "Lấy danh sách người theo dõi khóa học thành công",
      courseId,
      courseTitle: course.title,
      ...result
    });

  } catch (error) {
    console.error("Get course followers error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy danh sách người theo dõi khóa học"
    });
  }
}

// Lấy danh sách người theo dõi trung tâm
async function getCenterFollowers(req, res) {
  try {
    const { centerId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Kiểm tra center có tồn tại không
    const center = await Center.findById(centerId);
    if (!center) {
      return res.status(404).json({
        error: "Trung tâm không tồn tại"
      });
    }

    const result = await Follow.findByCenterId(centerId, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      message: "Lấy danh sách người theo dõi trung tâm thành công",
      centerId,
      centerName: center.name,
      ...result
    });

  } catch (error) {
    console.error("Get center followers error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy danh sách người theo dõi trung tâm"
    });
  }
}

// Lấy top khóa học được follow nhiều nhất
async function getTopFollowedCourses(req, res) {
  try {
    const { limit = 10 } = req.query;

    const courses = await Follow.getTopFollowedCourses({
      limit: parseInt(limit)
    });

    res.json({
      message: "Lấy top khóa học được theo dõi nhiều nhất thành công",
      data: courses
    });

  } catch (error) {
    console.error("Get top followed courses error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy top khóa học được theo dõi nhiều nhất"
    });
  }
}

// Lấy danh sách follow mới nhất
async function getRecentFollows(req, res) {
  try {
    const { limit = 10 } = req.query;

    const follows = await Follow.getRecentFollows({
      limit: parseInt(limit)
    });

    res.json({
      message: "Lấy danh sách theo dõi mới nhất thành công",
      data: follows
    });

  } catch (error) {
    console.error("Get recent follows error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy danh sách theo dõi mới nhất"
    });
  }
}

// Lấy thống kê follow
async function getFollowStats(req, res) {
  try {
    const { userId, courseId } = req.query;

    let stats = {};

    if (userId) {
      // Thống kê của user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          error: "Người dùng không tồn tại"
        });
      }

      const followingCount = await Follow.countByUserId(userId);
      stats = {
        type: 'user',
        userId,
        userName: user.name,
        followingCount
      };
    }

    if (courseId) {
      // Thống kê của course
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({
          error: "Khóa học không tồn tại"
        });
      }

      const followersCount = await Follow.countByCourseId(courseId);
      stats = {
        type: 'course',
        courseId,
        courseTitle: course.title,
        followersCount
      };
    }

    if (!userId && !courseId) {
      // Thống kê tổng quan (có thể thêm các thống kê khác)
      stats = {
        type: 'general',
        message: "Vui lòng cung cấp userId hoặc courseId để xem thống kê chi tiết"
      };
    }

    res.json({
      message: "Lấy thống kê theo dõi thành công",
      stats
    });

  } catch (error) {
    console.error("Get follow stats error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy thống kê theo dõi"
    });
  }
}