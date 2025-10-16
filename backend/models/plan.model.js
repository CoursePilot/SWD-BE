const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

// Lấy tất cả plans với phân trang và lọc
async function findAll({ page = 1, limit = 10, isDeleted = false }) {
  const offset = (page - 1) * limit;
  let whereClause = "is_deleted = ?";
  let params = [isDeleted ? 1 : 0];

  params.push(limit, offset);

  const [rows] = await db.query(
    `SELECT 
      id, 
      name, 
      price, 
      duration_days AS durationDays, 
      lead_quota AS leadQuota, 
      post_quota AS postQuota, 
      description,
      is_deleted AS isDeleted,
      created_by AS createdBy,
      updated_by AS updatedBy,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM plans 
    WHERE ${whereClause}
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?`,
    params
  );

  // Đếm tổng số records
  const countParams = params.slice(0, -2); // Remove limit and offset
  const [countRows] = await db.query(
    `SELECT COUNT(*) as total FROM plans WHERE ${whereClause}`,
    countParams
  );

  return {
    plans: rows,
    total: countRows[0].total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(countRows[0].total / limit)
  };
}

// Lấy plan theo ID
async function findById(id) {
  const [rows] = await db.query(
    `SELECT 
      id, 
      name, 
      price, 
      duration_days AS durationDays, 
      lead_quota AS leadQuota, 
      post_quota AS postQuota, 
      description,
      is_deleted AS isDeleted,
      created_by AS createdBy,
      updated_by AS updatedBy,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM plans 
    WHERE id = ? AND is_deleted = 0 
    LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

// Tạo plan mới
async function create({ name, price, durationDays, leadQuota, postQuota, description, createdBy }) {
  const id = uuidv4();
  
  await db.query(
    `INSERT INTO plans (
      id, 
      name, 
      price, 
      duration_days, 
      lead_quota, 
      post_quota, 
      description, 
      created_by, 
      updated_by, 
      is_deleted, 
      created_at, 
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [id, name, price, durationDays, leadQuota, postQuota, description, createdBy, createdBy]
  );
  return id;
}

// Cập nhật plan
async function update(id, updates, updatedBy) {
  const updateFields = [];
  const updateValues = [];

  if (updates.name !== undefined) {
    updateFields.push("name = ?");
    updateValues.push(updates.name);
  }
  
  if (updates.price !== undefined) {
    updateFields.push("price = ?");
    updateValues.push(updates.price);
  }
  
  if (updates.durationDays !== undefined) {
    updateFields.push("duration_days = ?");
    updateValues.push(updates.durationDays);
  }
  
  if (updates.leadQuota !== undefined) {
    updateFields.push("lead_quota = ?");
    updateValues.push(updates.leadQuota);
  }
  
  if (updates.postQuota !== undefined) {
    updateFields.push("post_quota = ?");
    updateValues.push(updates.postQuota);
  }
  
  if (updates.description !== undefined) {
    updateFields.push("description = ?");
    updateValues.push(updates.description);
  }

  if (updateFields.length === 0) {
    return; // Nothing to update
  }

  updateFields.push("updated_by = ?", "updated_at = UTC_TIMESTAMP()");
  updateValues.push(updatedBy, id);
  
  await db.query(
    `UPDATE plans SET ${updateFields.join(", ")} WHERE id = ? AND is_deleted = 0`,
    updateValues
  );
}

// Xóa plan (soft delete)
async function deletePlan(id, deletedBy) {
  await db.query(
    `UPDATE plans SET is_deleted = 1, updated_by = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?`,
    [deletedBy, id]
  );
}

// Kiểm tra tên plan đã tồn tại chưa
async function nameExists(name, excludeId = null) {
  let whereClause = "name = ? AND is_deleted = 0";
  let params = [name];
  
  if (excludeId) {
    whereClause += " AND id != ?";
    params.push(excludeId);
  }

  const [rows] = await db.query(
    `SELECT id FROM plans WHERE ${whereClause} LIMIT 1`,
    params
  );
  return rows.length > 0;
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  deletePlan,
  nameExists,
};
