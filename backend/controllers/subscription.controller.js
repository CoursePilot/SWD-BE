const Subscription = require("../models/subscription.model");
const Plan = require("../models/plan.model");

module.exports = {
  getMySubscriptions,
  getSubscriptionById,
  createSubscription,
  cancelSubscription,
  renewSubscription,
  deleteSubscription,
};

// GET /subscriptions - Lấy tất cả đăng ký của trung tâm hiện tại
async function getMySubscriptions(req, res) {
  try {
    const centerId = req.user.id; // giả sử centerId = user.id khi role center
    const { page = 1, limit = 10, status } = req.query;

    const result = await Subscription.findAllByCenter(centerId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status: status || null,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("Get subscriptions error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// GET /subscriptions/:id - Xem chi tiết đăng ký
async function getSubscriptionById(req, res) {
  try {
    const { id } = req.params;
    const sub = await Subscription.findById(id);
    if (!sub) {
      return res.status(404).json({ error: "Không tìm thấy đăng ký" });
    }
    // center chỉ được xem của mình
    if (req.user.role === 2 && sub.centerId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return res.status(200).json({ subscription: sub });
  } catch (err) {
    console.error("Get subscription by id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// POST /subscriptions - Đăng ký gói mới (center chọn plan)
async function createSubscription(req, res) {
  try {
    const userId = req.user.id;
    const { planId, autoRenew = 0 } = req.body;

    if (!planId) {
      return res.status(400).json({ error: "planId là bắt buộc" });
    }

    // Lấy center của user
    const Center = require("../models/center.model");
    const center = await Center.findByUserId(userId);
    
    if (!center) {
      return res.status(404).json({ 
        error: "Bạn chưa có trung tâm. Vui lòng submit center request trước." 
      });
    }

    if (center.status === 'pending') {
      return res.status(400).json({ 
        error: "Trung tâm của bạn đang chờ duyệt. Vui lòng đợi admin approve." 
      });
    }

    if (center.status === 'rejected') {
      return res.status(400).json({ 
        error: "Trung tâm của bạn đã bị từ chối." 
      });
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ error: "Không tìm thấy gói" });
    }

    // Tính start/end theo UTC
    const now = new Date();
    const startAt = new Date(now);
    const endAt = new Date(now);
    endAt.setUTCDate(endAt.getUTCDate() + Number(plan.durationDays));

    const id = await Subscription.create({
      centerId: center.id, // Sử dụng center.id, không phải user.id
      planId,
      startAt,
      endAt,
      autoRenew: autoRenew ? 1 : 0,
    });

    const created = await Subscription.findById(id);
    return res.status(201).json({
      message: "Tạo đăng ký thành công",
      subscription: created,
    });
  } catch (err) {
    console.error("Create subscription error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// PATCH /subscriptions/:id/cancel - Hủy đăng ký (ghi lý do)
async function cancelSubscription(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const sub = await Subscription.findById(id);
    if (!sub) {
      return res.status(404).json({ error: "Không tìm thấy đăng ký" });
    }
    if (req.user.role === 2 && sub.centerId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await Subscription.cancel(id, reason || null);
    const updated = await Subscription.findById(id);
    return res.status(200).json({ message: "Hủy đăng ký thành công", subscription: updated });
  } catch (err) {
    console.error("Cancel subscription error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// PATCH /subscriptions/:id/renew - Gia hạn gói
async function renewSubscription(req, res) {
  try {
    const { id } = req.params;
    const sub = await Subscription.findById(id);
    if (!sub) {
      return res.status(404).json({ error: "Không tìm thấy đăng ký" });
    }
    if (req.user.role === 2 && sub.centerId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Lấy lại plan để tính hạn mới
    const plan = await Plan.findById(sub.planId);
    if (!plan) {
      return res.status(404).json({ error: "Không tìm thấy gói" });
    }

    const now = new Date();
    const startAt = new Date(now);
    const endAt = new Date(now);
    endAt.setUTCDate(endAt.getUTCDate() + Number(plan.durationDays));

    await Subscription.renew(id, { startAt, endAt });
    const updated = await Subscription.findById(id);
    return res.status(200).json({ message: "Gia hạn thành công", subscription: updated });
  } catch (err) {
    console.error("Renew subscription error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// DELETE /subscriptions/:id - Soft delete
async function deleteSubscription(req, res) {
  try {
    const { id } = req.params;
    const sub = await Subscription.findById(id);
    if (!sub) {
      return res.status(404).json({ error: "Không tìm thấy đăng ký" });
    }
    // Admin có thể xóa; center chỉ xóa của mình
    if (req.user.role === 2 && sub.centerId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await Subscription.deleteSubscription(id);
    return res.status(200).json({ message: "Xóa đăng ký thành công" });
  } catch (err) {
    console.error("Delete subscription error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}


