const { validationResult } = require('express-validator');
const Schedule = require('../models/schedule.model');
const Course = require('../models/course.model');

module.exports = {
  createSchedule,
  getAllSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  getSchedulesByCourse,
  getUpcomingSchedules
};

// Tạo schedule mới
async function createSchedule(req, res) {
  try {
    // Kiểm tra validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Dữ liệu không hợp lệ",
        details: errors.array()
      });
    }

    const { courseId, startDate, endDate, seats, location, status } = req.body;

    // Kiểm tra course có tồn tại không
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        error: "Khóa học không tồn tại"
      });
    }

    const scheduleId = await Schedule.create({
      courseId,
      startDate,
      endDate,
      seats,
      location,
      status: status || 'open'
    });

    const schedule = await Schedule.findById(scheduleId);

    res.status(201).json({
      message: "Tạo lịch học thành công",
      schedule
    });

  } catch (error) {
    console.error("Create schedule error:", error);
    res.status(500).json({
      error: "Lỗi server khi tạo lịch học"
    });
  }
}

// Lấy tất cả schedules với filter và pagination
async function getAllSchedules(req, res) {
  try {
    const { 
      page = 1, 
      limit = 10, 
      courseId = null, 
      status = null, 
      startDate = null, 
      endDate = null 
    } = req.query;

    const result = await Schedule.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      courseId,
      status,
      startDate,
      endDate
    });

    res.json({
      message: "Lấy danh sách lịch học thành công",
      ...result
    });

  } catch (error) {
    console.error("Get all schedules error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy danh sách lịch học"
    });
  }
}

// Lấy schedule theo ID
async function getScheduleById(req, res) {
  try {
    const { id } = req.params;

    const schedule = await Schedule.findById(id);
    if (!schedule) {
      return res.status(404).json({
        error: "Lịch học không tồn tại"
      });
    }

    res.json({
      message: "Lấy thông tin lịch học thành công",
      schedule
    });

  } catch (error) {
    console.error("Get schedule by id error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy thông tin lịch học"
    });
  }
}

// Cập nhật schedule
async function updateSchedule(req, res) {
  try {
    // Kiểm tra validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Dữ liệu không hợp lệ",
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { courseId, startDate, endDate, seats, location, status } = req.body;

    // Kiểm tra schedule có tồn tại không
    const existingSchedule = await Schedule.findById(id);
    if (!existingSchedule) {
      return res.status(404).json({
        error: "Lịch học không tồn tại"
      });
    }

    // Nếu cập nhật courseId, kiểm tra course có tồn tại không
    if (courseId) {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({
          error: "Khóa học không tồn tại"
        });
      }
    }

    const updated = await Schedule.updateById(id, {
      courseId,
      startDate,
      endDate,
      seats,
      location,
      status
    });

    if (!updated) {
      return res.status(404).json({
        error: "Không thể cập nhật lịch học"
      });
    }

    const schedule = await Schedule.findById(id);

    res.json({
      message: "Cập nhật lịch học thành công",
      schedule
    });

  } catch (error) {
    console.error("Update schedule error:", error);
    res.status(500).json({
      error: "Lỗi server khi cập nhật lịch học"
    });
  }
}

// Xóa schedule
async function deleteSchedule(req, res) {
  try {
    const { id } = req.params;

    // Kiểm tra schedule có tồn tại không
    const schedule = await Schedule.findById(id);
    if (!schedule) {
      return res.status(404).json({
        error: "Lịch học không tồn tại"
      });
    }

    const deleted = await Schedule.deleteById(id);
    if (!deleted) {
      return res.status(404).json({
        error: "Không thể xóa lịch học"
      });
    }

    res.json({
      message: "Xóa lịch học thành công"
    });

  } catch (error) {
    console.error("Delete schedule error:", error);
    res.status(500).json({
      error: "Lỗi server khi xóa lịch học"
    });
  }
}

// Lấy schedules theo course ID
async function getSchedulesByCourse(req, res) {
  try {
    const { courseId } = req.params;
    const { page = 1, limit = 10, status = null } = req.query;

    // Kiểm tra course có tồn tại không
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        error: "Khóa học không tồn tại"
      });
    }

    const result = await Schedule.findByCourseId(courseId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });

    res.json({
      message: "Lấy danh sách lịch học theo khóa học thành công",
      courseId,
      courseTitle: course.title,
      ...result
    });

  } catch (error) {
    console.error("Get schedules by course error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy danh sách lịch học theo khóa học"
    });
  }
}

// Lấy schedules sắp diễn ra
async function getUpcomingSchedules(req, res) {
  try {
    const { page = 1, limit = 10, courseId = null } = req.query;

    const result = await Schedule.findUpcoming({
      page: parseInt(page),
      limit: parseInt(limit),
      courseId
    });

    res.json({
      message: "Lấy danh sách lịch học sắp diễn ra thành công",
      ...result
    });

  } catch (error) {
    console.error("Get upcoming schedules error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy danh sách lịch học sắp diễn ra"
    });
  }
}