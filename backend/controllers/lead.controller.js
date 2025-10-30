const Lead = require("../models/lead.model");
const Subscription = require("../models/subscription.model");
const Center = require("../models/center.model");
const Course = require("../models/course.model");
const { validationResult } = require("express-validator");
const db = require("../config/db");

module.exports = {
  createLead,
  getAllLeads,
  getLeadById,
  updateLead,
  deleteLead,
  getLeadsByCenter
};

// Tạo lead mới
async function createLead(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Dữ liệu không hợp lệ",
        details: errors.array()
      });
    }

    const { courseId, scheduleId, studentId, note, consentAt } = req.body;
    let { name, email, phone } = req.body;

    // Kiểm tra course tồn tại
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        error: "Course không tồn tại"
      });
    }

    // Kiểm tra schedule nếu có
    if (scheduleId) {
      const [scheduleRows] = await db.query(`
        SELECT id FROM schedules WHERE id = ? AND course_id = ?
      `, [scheduleId, courseId]);
      
      if (scheduleRows.length === 0) {
        return res.status(404).json({
          error: "Schedule không tồn tại hoặc không thuộc course này"
        });
      }
    }

    // Kiểm tra user (student) và auto-fill thông tin
    let studentInfo = null;
    if (studentId) {
      const [userRows] = await db.query(`
        SELECT id, name, email, phone FROM users WHERE id = ?
      `, [studentId]);
      
      if (userRows.length === 0) {
        return res.status(404).json({
          error: "Student không tồn tại"
        });
      }
      
      studentInfo = userRows[0];
      
      // Auto-fill thông tin từ user (luôn override nếu có studentId)
      name = studentInfo.name || name;
      email = studentInfo.email || email;
      phone = studentInfo.phone || phone;
    }

    // Validation sau khi auto-fill
    if (!name) {
      return res.status(400).json({
        error: "Thiếu thông tin bắt buộc: name (từ studentId hoặc manual)"
      });
    }
    
    if (!phone) {
      return res.status(400).json({
        error: "Thiếu thông tin bắt buộc: phone (từ studentId hoặc manual)"
      });
    }

    // Kiểm tra subscription và lead quota của center
    const quotaCheck = await Subscription.checkQuotaAvailable(course.centerId, 'lead');
    if (!quotaCheck.available) {
      return res.status(403).json({
        error: "Không thể tạo lead",
        reason: quotaCheck.reason,
        quota: {
          used: quotaCheck.used,
          limit: quotaCheck.limit,
          remaining: quotaCheck.remaining
        }
      });
    }

    // Tạo lead
    const leadId = await Lead.create({
      courseId,
      scheduleId,
      studentId,
      name,
      email,
      phone,
      note,
      consentAt
    });

    // Tăng lead_used counter cho center
    const subscription = await Subscription.findActiveByCenterId(course.centerId);
    if (subscription) {
      await Subscription.incrementLeadUsed(subscription.id);
      console.log(`Lead quota used: ${subscription.lead_used + 1}/${subscription.planLeadQuota} for center ${course.centerId}`);
    }

    // Lấy lead vừa tạo với thông tin liên quan
    const lead = await Lead.findById(leadId);

    const response = {
      message: "Tạo lead thành công",
      lead,
      quota: {
        used: quotaCheck.used + 1,
        limit: quotaCheck.limit,
        remaining: quotaCheck.remaining - 1
      }
    };

    // Thêm thông tin auto-filled nếu có
    if (studentInfo) {
      response.autoFilled = {
        from: "student",
        studentInfo: {
          id: studentInfo.id,
          fullName: studentInfo.name,
          email: studentInfo.email,
          phone: studentInfo.phone
        }
      };
    }

    res.status(201).json(response);

  } catch (error) {
    console.error("Create lead error:", error);
    res.status(500).json({
      error: "Lỗi server khi tạo lead"
    });
  }
}

// Lấy tất cả leads
async function getAllLeads(req, res) {
  try {
    const { page = 1, limit = 10, status, courseId, centerId } = req.query;

    const result = await Lead.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      courseId,
      centerId
    });

    res.json({
      message: "Lấy danh sách leads thành công",
      ...result
    });

  } catch (error) {
    console.error("Get all leads error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy danh sách leads"
    });
  }
}

// Lấy lead theo ID
async function getLeadById(req, res) {
  try {
    const { leadId } = req.params;

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        error: "Lead không tồn tại"
      });
    }

    res.json({
      message: "Lấy thông tin lead thành công",
      lead
    });

  } catch (error) {
    console.error("Get lead by ID error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy thông tin lead"
    });
  }
}

// Cập nhật lead
async function updateLead(req, res) {
  try {
    const { leadId } = req.params;
    const { courseId, scheduleId, studentId, name, phone, email, note, status } = req.body;

    const [result] = await db.query(`
      UPDATE leads 
      SET course_id = ?, schedule_id = ?, student_id = ?, name = ?, phone = ?, email = ?, note = ?, status = ?
      WHERE id = ?
    `, [courseId, scheduleId, studentId, name, phone, email, note, status, leadId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "Lead không tồn tại"
      });
    }

    // Lấy lead sau khi update
    const [rows] = await db.query(`
      SELECT 
        l.*,
        c.title AS courseTitle,
        ce.name AS centerName,
        u.name AS studentName
      FROM leads l
      LEFT JOIN courses c ON l.course_id = c.id
      LEFT JOIN centers ce ON c.center_id = ce.id
      LEFT JOIN users u ON l.student_id = u.id
      WHERE l.id = ?
    `, [leadId]);

    res.json({
      message: "Cập nhật lead thành công",
      lead: rows[0]
    });

  } catch (error) {
    console.error("Update lead error:", error);
    res.status(500).json({
      error: "Lỗi server khi cập nhật lead"
    });
  }
}

// Xóa lead
async function deleteLead(req, res) {
  try {
    const { leadId } = req.params;

    const [result] = await db.query(`
      UPDATE leads 
      SET is_deleted = 1, updated_at = NOW()
      WHERE id = ? AND is_deleted = 0
    `, [leadId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "Lead không tồn tại"
      });
    }

    res.json({
      message: "Xóa lead thành công"
    });

  } catch (error) {
    console.error("Delete lead error:", error);
    res.status(500).json({
      error: "Lỗi server khi xóa lead"
    });
  }
}

// Lấy leads theo center
async function getLeadsByCenter(req, res) {
  try {
    const { centerId } = req.params;
    const { page = 1, limit = 10, status, courseId } = req.query;
    const offset = (page - 1) * limit;

    // Leads không có center_id trực tiếp, phải JOIN qua courses
    let whereClause = "WHERE c.center_id = ? AND l.is_deleted = 0";
    const params = [centerId];

    if (status) {
      whereClause += " AND l.status = ?";
      params.push(status);
    }

    if (courseId) {
      whereClause += " AND l.course_id = ?";
      params.push(courseId);
    }

    params.push(parseInt(limit), offset);

    const [rows] = await db.query(`
      SELECT 
        l.*,
        c.title AS courseTitle,
        c.summary AS courseSummary,
        c.center_id AS centerId,
        u.name AS studentName,
        u.email AS studentEmail
      FROM leads l
      INNER JOIN courses c ON l.course_id = c.id
      LEFT JOIN users u ON l.student_id = u.id
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `, params);

    const countParams = params.slice(0, -2);
    const [countRows] = await db.query(`
      SELECT COUNT(*) AS total 
      FROM leads l
      INNER JOIN courses c ON l.course_id = c.id
      ${whereClause}
    `, countParams);

    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      message: "Lấy danh sách leads theo center thành công",
      centerId,
      courseId: courseId || null,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error("Get leads by center error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy danh sách leads theo center"
    });
  }
}