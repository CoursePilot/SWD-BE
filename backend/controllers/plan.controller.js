const Plan = require("../models/plan.model");

module.exports = {
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
};

// Lấy tất cả plans (public - không cần auth)
async function getAllPlans(req, res) {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const result = await Plan.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      isDeleted: false
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("Get all plans error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Lấy plan theo ID (public - không cần auth)
async function getPlanById(req, res) {
  try {
    const { id } = req.params;
    
    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({
        error: "Không tìm thấy gói"
      });
    }

    return res.status(200).json({
      plan
    });
  } catch (err) {
    console.error("Get plan by ID error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Tạo plan mới (chỉ admin)
async function createPlan(req, res) {
  try {
    const { name, price, durationDays, leadQuota, postQuota, description } = req.body;
    const createdBy = req.user.id;
    
    // Kiểm tra tên plan đã tồn tại chưa
    const nameAlreadyExists = await Plan.nameExists(name);
    if (nameAlreadyExists) {
      return res.status(400).json({
        error: "Tên gói đã tồn tại"
      });
    }

    // Validation cơ bản
    if (!name || !price || !durationDays || leadQuota === undefined || postQuota === undefined) {
      return res.status(400).json({
        error: "Thiếu thông tin bắt buộc"
      });
    }

    if (price < 0 || durationDays <= 0 || leadQuota < 0 || postQuota < 0) {
      return res.status(400).json({
        error: "Giá trị không hợp lệ"
      });
    }

    // Tạo plan
    const planId = await Plan.create({
      name,
      price: parseFloat(price),
      durationDays: parseInt(durationDays),
      leadQuota: parseInt(leadQuota),
      postQuota: parseInt(postQuota),
      description: description || null,
      createdBy
    });

    const newPlan = await Plan.findById(planId);

    return res.status(201).json({
      message: "Tạo gói thành công",
      plan: newPlan
    });
  } catch (err) {
    console.error("Create plan error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Cập nhật plan (chỉ admin)
async function updatePlan(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedBy = req.user.id;

    // Kiểm tra plan tồn tại
    const existingPlan = await Plan.findById(id);
    if (!existingPlan) {
      return res.status(404).json({
        error: "Không tìm thấy gói"
      });
    }

    // Kiểm tra tên plan đã tồn tại chưa (nếu có thay đổi tên)
    if (updates.name && updates.name !== existingPlan.name) {
      const nameAlreadyExists = await Plan.nameExists(updates.name, id);
      if (nameAlreadyExists) {
        return res.status(400).json({
          error: "Tên gói đã tồn tại"
        });
      }
    }

    // Validation cho các giá trị số
    if (updates.price !== undefined && updates.price < 0) {
      return res.status(400).json({
        error: "Giá không hợp lệ"
      });
    }

    if (updates.durationDays !== undefined && updates.durationDays <= 0) {
      return res.status(400).json({
        error: "Số ngày không hợp lệ"
      });
    }

    if (updates.leadQuota !== undefined && updates.leadQuota < 0) {
      return res.status(400).json({
        error: "Lead quota không hợp lệ"
      });
    }

    if (updates.postQuota !== undefined && updates.postQuota < 0) {
      return res.status(400).json({
        error: "Post quota không hợp lệ"
      });
    }

    // Cập nhật plan
    await Plan.update(id, updates, updatedBy);
    const updatedPlan = await Plan.findById(id);

    return res.status(200).json({
      message: "Cập nhật gói thành công",
      plan: updatedPlan
    });
  } catch (err) {
    console.error("Update plan error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Xóa plan (chỉ admin - soft delete)
async function deletePlan(req, res) {
  try {
    const { id } = req.params;
    const deletedBy = req.user.id;
    
    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({
        error: "Không tìm thấy gói"
      });
    }

    await Plan.deletePlan(id, deletedBy);

    return res.status(200).json({
      message: "Xóa gói thành công"
    });
  } catch (err) {
    console.error("Delete plan error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
