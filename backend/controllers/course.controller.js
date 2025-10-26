const Course = require("../models/course.model");
const Center = require("../models/center.model");
const Subscription = require("../models/subscription.model");
const { validationResult } = require("express-validator");
const db = require("../config/db");

module.exports = {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getCoursesByCenter,
  getMyCourses,
  approveCourse,
  rejectCourse
};

// Tạo course mới
async function createCourse(req, res) {
  try {
    // Kiểm tra validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Dữ liệu không hợp lệ",
        details: errors.array()
      });
    }

    const { centerId, categoryId, title, summary, content, priceMin, priceMax, modality, status } = req.body;

    // Xử lý image upload nếu có
    let imageUrl = null;
    if (req.files && req.files.image && req.files.image[0]) {
      try {
        const supabase = require('../config/supabase');
        const imageFile = req.files.image[0];
        const fileName = `course-${Date.now()}-${imageFile.originalname.replace(/\s+/g, "_")}`;
        const filePath = `courses/${centerId}/${fileName}`;

        const { data, error } = await supabase.storage
          .from('SWD_image')
          .upload(filePath, imageFile.buffer, {
            contentType: imageFile.mimetype,
            upsert: false
          });

        if (error) {
          console.error("Supabase upload error:", error);
          return res.status(500).json({
            error: "Failed to upload course image"
          });
        }

        const { data: urlData } = supabase.storage
          .from('SWD_image')
          .getPublicUrl(filePath);

        imageUrl = urlData.publicUrl;
      } catch (uploadError) {
        console.error("Course image upload failed:", uploadError);
        return res.status(500).json({
          error: "Course image upload failed"
        });
      }
    }

    // Kiểm tra xem center có tồn tại không
    const center = await Center.findById(centerId);
    if (!center) {
      return res.status(404).json({
        error: "Trung tâm không tồn tại"
      });
    }

    // Kiểm tra subscription và post quota
    const quotaCheck = await Subscription.checkQuotaAvailable(centerId, 'post');
    if (!quotaCheck.available) {
      return res.status(403).json({
        error: "Không thể tạo course",
        reason: quotaCheck.reason,
        quota: {
          used: quotaCheck.used,
          limit: quotaCheck.limit,
          remaining: quotaCheck.remaining
        }
      });
    }

    const courseId = await Course.create({
      centerId,
      categoryId,
      title,
      summary,
      imageUrl,
      content,
      priceMin,
      priceMax,
      modality,
      status: status || 'draft'
    });

    // Tăng post_used counter nếu course được tạo thành công
    const subscription = await Subscription.findActiveByCenterId(centerId);
    if (subscription) {
      await Subscription.incrementPostUsed(subscription.id);
      console.log(`Post quota used: ${subscription.post_used + 1}/${subscription.planPostQuota} for center ${centerId}`);
    }

    const course = await Course.findById(courseId);

    res.status(201).json({
      message: "Tạo khóa học thành công",
      course,
      quota: {
        used: quotaCheck.used + 1,
        limit: quotaCheck.limit,
        remaining: quotaCheck.remaining - 1
      }
    });

  } catch (error) {
    console.error("Create course error:", error);
    res.status(500).json({
      error: "Lỗi server khi tạo khóa học"
    });
  }
}

// Lấy tất cả courses với filter và pagination
async function getAllCourses(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      centerId,
      categoryId,
      status,
      modality,
      search
    } = req.query;

    const result = await Course.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      centerId,
      categoryId,
      status,
      modality,
      search
    });

    res.status(200).json({
      message: "Lấy danh sách khóa học thành công",
      ...result
    });

  } catch (error) {
    console.error("Get all courses error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy danh sách khóa học"
    });
  }
}

// Lấy course theo ID
async function getCourseById(req, res) {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        error: "Khóa học không tồn tại"
      });
    }

    res.status(200).json({
      message: "Lấy thông tin khóa học thành công",
      course
    });

  } catch (error) {
    console.error("Get course by ID error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy thông tin khóa học"
    });
  }
}

// Cập nhật course
async function updateCourse(req, res) {
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
    const { centerId, categoryId, title, summary, content, priceMin, priceMax, modality, status } = req.body;
    const userId = req.user.id;

    // Xử lý image upload nếu có
    let imageUrl = null;
    if (req.files && req.files.image && req.files.image[0]) {
      try {
        const supabase = require('../config/supabase');
        const imageFile = req.files.image[0];
        const fileName = `course-${Date.now()}-${imageFile.originalname.replace(/\s+/g, "_")}`;
        const filePath = `courses/${course.centerId}/${fileName}`;

        // Delete old image if exists
        if (course.imageUrl) {
          try {
            const urlParts = course.imageUrl.split('/');
            const oldFileName = urlParts[urlParts.length - 1];
            const oldFilePath = `courses/${course.centerId}/${oldFileName}`;
            await supabase.storage.from('SWD_image').remove([oldFilePath]);
          } catch (deleteError) {
            console.log('Old image deletion failed:', deleteError);
          }
        }

        const { data, error } = await supabase.storage
          .from('SWD_image')
          .upload(filePath, imageFile.buffer, {
            contentType: imageFile.mimetype,
            upsert: false
          });

        if (error) {
          console.error("Supabase upload error:", error);
          return res.status(500).json({
            error: "Failed to upload course image"
          });
        }

        const { data: urlData } = supabase.storage
          .from('SWD_image')
          .getPublicUrl(filePath);

        imageUrl = urlData.publicUrl;
      } catch (uploadError) {
        console.error("Course image upload failed:", uploadError);
        return res.status(500).json({
          error: "Course image upload failed"
        });
      }
    }

    // Kiểm tra course tồn tại
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        error: "Khóa học không tồn tại"
      });
    }

    // Kiểm tra quyền cập nhật
    const center = await Center.findById(course.centerId);
    if (req.user.role !== 3 && center.userId !== userId) {
      return res.status(403).json({
        error: "Bạn không có quyền cập nhật khóa học này"
      });
    }

    // Nếu thay đổi centerId, kiểm tra center mới
    if (centerId && centerId !== course.centerId) {
      const newCenter = await Center.findById(centerId);
      if (!newCenter) {
        return res.status(404).json({
          error: "Trung tâm mới không tồn tại"
        });
      }

      if (req.user.role !== 3 && newCenter.userId !== userId) {
        return res.status(403).json({
          error: "Bạn không có quyền chuyển khóa học sang trung tâm này"
        });
      }
    }

    const updated = await Course.updateById(id, {
      centerId,
      categoryId,
      title,
      summary,
      imageUrl,
      content,
      priceMin,
      priceMax,
      modality,
      status
    });

    if (!updated) {
      return res.status(400).json({
        error: "Cập nhật khóa học thất bại"
      });
    }

    const updatedCourse = await Course.findById(id);

    res.status(200).json({
      message: "Cập nhật khóa học thành công",
      course: updatedCourse
    });

  } catch (error) {
    console.error("Update course error:", error);
    res.status(500).json({
      error: "Lỗi server khi cập nhật khóa học"
    });
  }
}

// Xóa course
async function deleteCourse(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Kiểm tra course tồn tại
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        error: "Khóa học không tồn tại"
      });
    }

    // Kiểm tra quyền xóa
    const center = await Center.findById(course.centerId);
    if (req.user.role !== 3 && center.userId !== userId) {
      return res.status(403).json({
        error: "Bạn không có quyền xóa khóa học này"
      });
    }

    const deleted = await Course.deleteById(id);
    if (!deleted) {
      return res.status(400).json({
        error: "Xóa khóa học thất bại"
      });
    }

    res.status(200).json({
      message: "Xóa khóa học thành công"
    });

  } catch (error) {
    console.error("Delete course error:", error);
    res.status(500).json({
      error: "Lỗi server khi xóa khóa học"
    });
  }
}

// Lấy courses theo center ID
async function getCoursesByCenter(req, res) {
  try {
    const { centerId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    // Kiểm tra center tồn tại
    const center = await Center.findById(centerId);
    if (!center) {
      return res.status(404).json({
        error: "Trung tâm không tồn tại"
      });
    }

    const result = await Course.findByCenterId(centerId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });

    res.status(200).json({
      message: "Lấy danh sách khóa học của trung tâm thành công",
      center: {
        id: center.id,
        name: center.name,
        logoUrl: center.logoUrl
      },
      ...result
    });

  } catch (error) {
    console.error("Get courses by center error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy danh sách khóa học"
    });
  }
}

// Lấy courses của center mà user sở hữu
async function getMyCourses(req, res) {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    // Tìm center của user
    const center = await Center.findByUserId(userId);
    if (!center) {
      return res.status(404).json({
        error: "Bạn chưa có trung tâm nào"
      });
    }

    const result = await Course.findByCenterId(center.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });

    res.status(200).json({
      message: "Lấy danh sách khóa học của tôi thành công",
      center: {
        id: center.id,
        name: center.name,
        logoUrl: center.logoUrl
      },
      ...result
    });

  } catch (error) {
    console.error("Get my courses error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy danh sách khóa học"
    });
  }
}

// Admin approve course
async function approveCourse(req, res) {
  try {
    const { courseId } = req.params;
    const { adminNote } = req.body;

    // Kiểm tra course tồn tại
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        error: "Course không tồn tại"
      });
    }

    // Kiểm tra course chưa được approve
    if (course.status === 'approved') {
      return res.status(400).json({
        error: "Course đã được approve trước đó"
      });
    }

    // Update course status
    await Course.update(courseId, {
      status: 'approved',
      adminNote: adminNote || null,
      approvedAt: new Date()
    });

    // Note: Post quota đã được tăng khi create course
    // Không cần tăng thêm ở đây

    const updatedCourse = await Course.findById(courseId);

    res.json({
      message: "Course đã được approve thành công",
      course: updatedCourse
    });

  } catch (error) {
    console.error("Approve course error:", error);
    res.status(500).json({
      error: "Lỗi server khi approve course"
    });
  }
}

// Admin reject course  
async function rejectCourse(req, res) {
  try {
    const { courseId } = req.params;
    const { adminNote, refundQuota = false } = req.body;

    // Kiểm tra course tồn tại
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        error: "Course không tồn tại"
      });
    }

    // Update course status
    await Course.update(courseId, {
      status: 'rejected',
      adminNote: adminNote || null,
      rejectedAt: new Date()
    });

    // Hoàn lại quota nếu được yêu cầu
    if (refundQuota) {
      const subscription = await Subscription.findActiveByCenterId(course.centerId);
      if (subscription && subscription.post_used > 0) {
        await db.query(`
          UPDATE subscriptions 
          SET post_used = GREATEST(0, post_used - 1),
              updated_at = NOW()
          WHERE id = ?
        `, [subscription.id]);
        
        console.log(`Refunded 1 post quota for center ${course.centerId}`);
      }
    }

    const updatedCourse = await Course.findById(courseId);

    res.json({
      message: refundQuota ? "Course đã bị reject và hoàn quota" : "Course đã bị reject",
      course: updatedCourse,
      quotaRefunded: refundQuota
    });

  } catch (error) {
    console.error("Reject course error:", error);
    res.status(500).json({
      error: "Lỗi server khi reject course"
    });
  }
}