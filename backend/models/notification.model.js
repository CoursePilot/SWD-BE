const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Tạo notification mới
// type: 'lead' | 'reminder' | 'system'
async function create(notificationData) {
  const id = uuidv4();
  const { userId, centerId, type, payload } = notificationData;
  
  await db.query(`
    INSERT INTO notifications (id, user_id, center_id, type, payload, created_at, is_deleted)
    VALUES (?, ?, ?, ?, ?, NOW(), 0)
  `, [id, userId, centerId, type, JSON.stringify(payload)]);
  
  return id;
}

// Tìm notification theo ID
async function findById(id) {
  const [rows] = await db.query(`
    SELECT 
      n.*,
      u.name AS userName,
      u.email AS userEmail,
      c.name AS centerName
    FROM notifications n
    LEFT JOIN users u ON n.user_id = u.id
    LEFT JOIN centers c ON n.center_id = c.id
    WHERE n.id = ? AND n.is_deleted = 0
  `, [id]);
  
  if (rows[0] && rows[0].payload) {
    // Chỉ parse nếu payload là string
    if (typeof rows[0].payload === 'string') {
      try {
        rows[0].payload = JSON.parse(rows[0].payload);
      } catch (e) {
        console.error('Failed to parse payload:', e);
      }
    }
  }
  
  return rows[0] || null;
}

// Lấy tất cả notifications với filter và phân trang
async function findAll({ page = 1, limit = 10, userId, centerId, type, isRead }) {
  // Parse to integers
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  const offset = (page - 1) * limit;
  
  let whereClause = "WHERE n.is_deleted = 0";
  const params = [];
  
  if (userId) {
    whereClause += " AND n.user_id = ?";
    params.push(userId);
  }
  
  if (centerId) {
    whereClause += " AND n.center_id = ?";
    params.push(centerId);
  }
  
  if (type) {
    whereClause += " AND n.type = ?";
    params.push(type);
  }
  
  if (isRead !== undefined) {
    if (isRead === 'true' || isRead === true) {
      whereClause += " AND n.read_at IS NOT NULL";
    } else {
      whereClause += " AND n.read_at IS NULL";
    }
  }
  
  params.push(limit, offset);
  
  const [rows] = await db.query(`
    SELECT 
      n.*,
      u.name AS userName,
      c.name AS centerName
    FROM notifications n
    LEFT JOIN users u ON n.user_id = u.id
    LEFT JOIN centers c ON n.center_id = c.id
    ${whereClause}
    ORDER BY n.created_at DESC
    LIMIT ? OFFSET ?
  `, params);
  
  // Parse JSON payload
  rows.forEach(row => {
    if (row.payload && typeof row.payload === 'string') {
      try {
        row.payload = JSON.parse(row.payload);
      } catch (e) {
        console.error('Failed to parse payload:', e);
      }
    }
  });
  
  // Count total
  const countParams = params.slice(0, -2);
  const [countRows] = await db.query(`
    SELECT COUNT(*) AS total 
    FROM notifications n
    ${whereClause}
  `, countParams);
  
  const total = countRows[0].total;
  const totalPages = Math.ceil(total / limit);
  
  return {
    notifications: rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}

// Lấy notifications của user
async function findByUserId(userId, { page = 1, limit = 10, isRead }) {
  return findAll({ page, limit, userId, isRead });
}

// Lấy notifications của center
async function findByCenterId(centerId, { page = 1, limit = 10, isRead }) {
  return findAll({ page, limit, centerId, isRead });
}

// Đánh dấu đã đọc
async function markAsRead(id) {
  const [result] = await db.query(`
    UPDATE notifications 
    SET read_at = NOW()
    WHERE id = ? AND is_deleted = 0
  `, [id]);
  
  return result.affectedRows > 0;
}

// Đánh dấu tất cả notifications của user là đã đọc
async function markAllAsReadByUser(userId) {
  const [result] = await db.query(`
    UPDATE notifications 
    SET read_at = NOW()
    WHERE user_id = ? AND read_at IS NULL AND is_deleted = 0
  `, [userId]);
  
  return result.affectedRows;
}

// Đánh dấu tất cả notifications của center là đã đọc
async function markAllAsReadByCenter(centerId) {
  const [result] = await db.query(`
    UPDATE notifications 
    SET read_at = NOW()
    WHERE center_id = ? AND read_at IS NULL AND is_deleted = 0
  `, [centerId]);
  
  return result.affectedRows;
}

// Cập nhật notification
async function updateById(id, updateData) {
  const { type, payload } = updateData;
  
  const fields = [];
  const params = [];
  
  if (type !== undefined) {
    fields.push("type = ?");
    params.push(type);
  }
  
  if (payload !== undefined) {
    fields.push("payload = ?");
    params.push(JSON.stringify(payload));
  }
  
  if (fields.length === 0) {
    throw new Error("Không có trường nào để cập nhật");
  }
  
  params.push(id);
  
  const [result] = await db.query(`
    UPDATE notifications 
    SET ${fields.join(", ")}
    WHERE id = ? AND is_deleted = 0
  `, params);
  
  return result.affectedRows > 0;
}

// Xóa mềm notification
async function deleteById(id) {
  const [result] = await db.query(`
    UPDATE notifications 
    SET is_deleted = 1
    WHERE id = ?
  `, [id]);
  
  return result.affectedRows > 0;
}

// Xóa tất cả notifications của user
async function deleteAllByUser(userId) {
  const [result] = await db.query(`
    UPDATE notifications 
    SET is_deleted = 1
    WHERE user_id = ? AND is_deleted = 0
  `, [userId]);
  
  return result.affectedRows;
}

// Đếm unread notifications
async function countUnread(userId, centerId) {
  let whereClause = "WHERE read_at IS NULL AND is_deleted = 0";
  const params = [];
  
  if (userId) {
    whereClause += " AND user_id = ?";
    params.push(userId);
  }
  
  if (centerId) {
    whereClause += " AND center_id = ?";
    params.push(centerId);
  }
  
  const [rows] = await db.query(`
    SELECT COUNT(*) AS count
    FROM notifications
    ${whereClause}
  `, params);
  
  return rows[0].count;
}

module.exports = {
  create,
  findById,
  findAll,
  findByUserId,
  findByCenterId,
  markAsRead,
  markAllAsReadByUser,
  markAllAsReadByCenter,
  updateById,
  deleteById,
  deleteAllByUser,
  countUnread
};
