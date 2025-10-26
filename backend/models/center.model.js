const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

// Tạo center request mới (status = 'pending')
async function createCenterRequest({ userId, name, logoUrl, phone, address, websiteUrl, description }) {
  const id = uuidv4();
  await db.query(
    "INSERT INTO centers (id, user_id, name, logo_url, phone, address, website_url, description, verified, status, is_deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending', 0, UTC_TIMESTAMP(), UTC_TIMESTAMP())",
    [id, userId, name, logoUrl, phone, address, websiteUrl, description]
  );
  return id;
}

// Lấy center theo user_id
async function findByUserId(userId) {
  const [rows] = await db.query(
    "SELECT id, user_id AS userId, name, logo_url AS logoUrl, phone, address, website_url AS websiteUrl, verified, status, description, created_at AS createdAt, updated_at AS updatedAt FROM centers WHERE user_id = ? AND is_deleted = 0 LIMIT 1",
    [userId]
  );
  return rows[0] || null;
}

// Lấy center theo id
async function findById(id) {
  const [rows] = await db.query(
    "SELECT id, user_id AS userId, name, logo_url AS logoUrl, phone, address, website_url AS websiteUrl, verified, status, description, created_at AS createdAt, updated_at AS updatedAt FROM centers WHERE id = ? AND is_deleted = 0 LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

// Lấy center theo id với thông tin user
async function findByIdWithUser(id) {
  const [rows] = await db.query(
    `SELECT 
      c.id, 
      c.user_id AS userId, 
      c.name, 
      c.logo_url AS logoUrl, 
      c.phone, 
      c.address, 
      c.website_url AS websiteUrl, 
      c.verified, 
      c.status, 
      c.description, 
      c.created_at AS createdAt, 
      c.updated_at AS updatedAt,
      u.name AS userName,
      u.email AS userEmail
    FROM centers c 
    LEFT JOIN users u ON c.user_id = u.id 
    WHERE c.id = ? AND c.is_deleted = 0 
    LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

// Lấy tất cả center với thông tin user
async function findAllWithUser({ page = 1, limit = 10, status = null, verified = null }) {
  const offset = (page - 1) * limit;
  let whereClause = "c.is_deleted = 0";
  let params = [];

  if (status) {
    whereClause += " AND c.status = ?";
    params.push(status);
  }

  if (verified !== null) {
    whereClause += " AND c.verified = ?";
    params.push(verified);
  }

  params.push(limit, offset);

  const [rows] = await db.query(
    `SELECT 
      c.id, 
      c.user_id AS userId, 
      c.name, 
      c.logo_url AS logoUrl, 
      c.phone, 
      c.address, 
      c.website_url AS websiteUrl, 
      c.verified, 
      c.status, 
      c.description, 
      c.created_at AS createdAt, 
      c.updated_at AS updatedAt,
      u.name AS userName,
      u.email AS userEmail
    FROM centers c 
    LEFT JOIN users u ON c.user_id = u.id 
    WHERE ${whereClause}
    ORDER BY c.created_at DESC 
    LIMIT ? OFFSET ?`,
    params
  );

  // Đếm tổng số records
  const countParams = params.slice(0, -2); // Remove limit and offset
  const [countRows] = await db.query(
    `SELECT COUNT(*) as total FROM centers c WHERE ${whereClause}`,
    countParams
  );

  return {
    centers: rows,
    total: countRows[0].total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(countRows[0].total / limit)
  };
}

// Kiểm tra xem user đã có request đang pending chưa
async function hasPendingRequest(userId) {
  const [rows] = await db.query(
    "SELECT id FROM centers WHERE user_id = ? AND status = 'pending' AND is_deleted = 0 LIMIT 1",
    [userId]
  );
  return rows.length > 0;
}

// Cập nhật trạng thái center (approve/reject)
async function updateStatus(id, status, adminNotes = null) {
  // Tạm thời bỏ qua adminNotes vì cột admin_notes chưa tồn tại trong database
  await db.query(
    "UPDATE centers SET status = ?, updated_at = UTC_TIMESTAMP() WHERE id = ? AND is_deleted = 0",
    [status, id]
  );
}

// Cập nhật thông tin center
async function updateCenter(id, { name, logoUrl, phone, address, websiteUrl, description }) {
  const updateFields = [];
  const updateValues = [];

  if (name !== undefined) {
    updateFields.push("name = ?");
    updateValues.push(name);
  }
  
  if (logoUrl !== undefined) {
    updateFields.push("logo_url = ?");
    updateValues.push(logoUrl);
  }
  
  if (phone !== undefined) {
    updateFields.push("phone = ?");
    updateValues.push(phone);
  }
  
  if (address !== undefined) {
    updateFields.push("address = ?");
    updateValues.push(address);
  }
  
  if (websiteUrl !== undefined) {
    updateFields.push("website_url = ?");
    updateValues.push(websiteUrl);
  }
  
  if (description !== undefined) {
    updateFields.push("description = ?");
    updateValues.push(description);
  }

  if (updateFields.length === 0) {
    return; // Nothing to update
  }

  updateFields.push("updated_at = UTC_TIMESTAMP()");
  updateValues.push(id);
  
  await db.query(
    `UPDATE centers SET ${updateFields.join(", ")} WHERE id = ? AND is_deleted = 0`,
    updateValues
  );
}

// Xóa center request (chỉ khi pending)
async function deleteCenterRequest(id) {
  await db.query(
    "UPDATE centers SET is_deleted = 1, updated_at = UTC_TIMESTAMP() WHERE id = ? AND status = 'pending'",
    [id]
  );
}

// Soft delete center
async function deleteCenter(id) {
  await db.query(
    "UPDATE centers SET is_deleted = 1, updated_at = UTC_TIMESTAMP() WHERE id = ?",
    [id]
  );
}

module.exports = {
  createCenterRequest,
  findByUserId,
  findById,
  findByIdWithUser,
  findAllWithUser,
  hasPendingRequest,
  updateStatus,
  updateCenter,
  deleteCenterRequest,
  deleteCenter,
};
