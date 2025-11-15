const Notification = require('../models/notification.model');
const { validationResult } = require('express-validator');
const socketManager = require('../utils/socketManager');

module.exports = {
  createNotification,
  getAllNotifications,
  getNotificationById,
  getMyNotifications,
  updateNotification,
  deleteNotification,
  markAsRead,
  markAllAsRead,
  deleteAllMyNotifications,
  getUnreadCount
};

// Tạo notification mới
async function createNotification(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Dữ liệu không hợp lệ",
        details: errors.array()
      });
    }

    let { userId, centerId, type, payload } = req.body;

    // Validate type
    const validTypes = ['lead', 'reminder', 'system'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Type không hợp lệ. Phải là một trong: ${validTypes.join(', ')}`
      });
    }

    // Parse payload nếu là string
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        return res.status(400).json({
          error: "Payload phải là JSON hợp lệ"
        });
      }
    }

    const notificationId = await Notification.create({
      userId,
      centerId,
      type,
      payload
    });

    const notification = await Notification.findById(notificationId);

    // 🔥 Emit real-time notification to user via Socket.io
    if (userId) {
      socketManager.sendNotification(userId, notification);
      
      // Also send updated unread count
      const unreadCount = await Notification.countUnread(userId, centerId);
      socketManager.sendUnreadCount(userId, unreadCount);
    }

    res.status(201).json({
      message: "Tạo notification thành công",
      notification
    });

  } catch (error) {
    console.error("Create notification error:", error);
    res.status(500).json({
      error: "Lỗi server khi tạo notification"
    });
  }
}

// Lấy tất cả notifications (Admin)
async function getAllNotifications(req, res) {
  try {
    const { page = 1, limit = 10, userId, centerId, type, isRead } = req.query;

    const result = await Notification.findAll({
      page,
      limit,
      userId,
      centerId,
      type,
      isRead
    });

    res.json({
      message: "Lấy danh sách notifications thành công",
      ...result
    });

  } catch (error) {
    console.error("Get all notifications error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy danh sách notifications"
    });
  }
}

// Lấy notification theo ID
async function getNotificationById(req, res) {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        error: "Notification không tồn tại"
      });
    }

    res.json({
      message: "Lấy thông tin notification thành công",
      notification
    });

  } catch (error) {
    console.error("Get notification by ID error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy thông tin notification"
    });
  }
}

// Lấy notifications của user hiện tại
async function getMyNotifications(req, res) {
  try {
    const { page = 1, limit = 10, isRead } = req.query;
    const userId = req.user.id;

    const result = await Notification.findByUserId(userId, {
      page,
      limit,
      isRead
    });

    res.json({
      message: "Lấy danh sách notifications thành công",
      ...result
    });

  } catch (error) {
    console.error("Get my notifications error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy notifications"
    });
  }
}

// Cập nhật notification
async function updateNotification(req, res) {
  try {
    const { id } = req.params;
    let { type, payload } = req.body;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        error: "Notification không tồn tại"
      });
    }

    // Validate type nếu có
    if (type) {
      const validTypes = ['lead', 'reminder', 'system'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          error: `Type không hợp lệ. Phải là một trong: ${validTypes.join(', ')}`
        });
      }
    }

    // Parse payload nếu là string
    if (payload && typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        return res.status(400).json({
          error: "Payload phải là JSON hợp lệ"
        });
      }
    }

    const updated = await Notification.updateById(id, {
      type,
      payload
    });

    if (!updated) {
      return res.status(400).json({
        error: "Cập nhật notification thất bại"
      });
    }

    const updatedNotification = await Notification.findById(id);

    res.json({
      message: "Cập nhật notification thành công",
      notification: updatedNotification
    });

  } catch (error) {
    console.error("Update notification error:", error);
    res.status(500).json({
      error: "Lỗi server khi cập nhật notification"
    });
  }
}

// Xóa notification
async function deleteNotification(req, res) {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        error: "Notification không tồn tại"
      });
    }

    const deleted = await Notification.deleteById(id);

    if (!deleted) {
      return res.status(400).json({
        error: "Xóa notification thất bại"
      });
    }

    res.json({
      message: "Xóa notification thành công"
    });

  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({
      error: "Lỗi server khi xóa notification"
    });
  }
}

// Đánh dấu notification đã đọc
async function markAsRead(req, res) {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        error: "Notification không tồn tại"
      });
    }

    const marked = await Notification.markAsRead(id);

    if (!marked) {
      return res.status(400).json({
        error: "Đánh dấu đã đọc thất bại"
      });
    }

    // 🔥 Emit updated unread count via Socket.io
    const userId = notification.userId;
    const unreadCount = await Notification.countUnread(userId, notification.centerId);
    socketManager.sendUnreadCount(userId, unreadCount);

    res.json({
      message: "Đánh dấu đã đọc thành công"
    });

  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({
      error: "Lỗi server khi đánh dấu đã đọc"
    });
  }
}

// Đánh dấu tất cả notifications đã đọc
async function markAllAsRead(req, res) {
  try {
    const userId = req.user.id;
    const { centerId } = req.query;

    let count;
    if (centerId) {
      count = await Notification.markAllAsReadByCenter(centerId);
    } else {
      count = await Notification.markAllAsReadByUser(userId);
    }

    // 🔥 Emit updated unread count (should be 0) via Socket.io
    socketManager.sendUnreadCount(userId, 0);

    res.json({
      message: `Đánh dấu ${count} notifications đã đọc thành công`,
      count
    });

  } catch (error) {
    console.error("Mark all as read error:", error);
    res.status(500).json({
      error: "Lỗi server khi đánh dấu đã đọc"
    });
  }
}

// Xóa tất cả notifications của user
async function deleteAllMyNotifications(req, res) {
  try {
    const userId = req.user.id;

    const count = await Notification.deleteAllByUser(userId);

    res.json({
      message: `Xóa ${count} notifications thành công`,
      count
    });

  } catch (error) {
    console.error("Delete all my notifications error:", error);
    res.status(500).json({
      error: "Lỗi server khi xóa notifications"
    });
  }
}

// Đếm số notification chưa đọc
async function getUnreadCount(req, res) {
  try {
    const userId = req.user.id;
    const { centerId } = req.query;

    const count = await Notification.countUnread(userId, centerId);

    res.json({
      message: "Lấy số lượng notifications chưa đọc thành công",
      count
    });

  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({
      error: "Lỗi server khi đếm notifications chưa đọc"
    });
  }
}
