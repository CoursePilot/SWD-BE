const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

// Tạo course mới
async function create({ centerId, categoryId, title, summary, imageUrl, content, priceMin, priceMax, modality, status = 'draft' }) {
  // Validate modality
  const validModalities = ['online', 'offline', 'blended'];
  if (modality && !validModalities.includes(modality)) {
    throw new Error(`Modality phải là một trong: ${validModalities.join(', ')}`);
  }
  
  // Validate status
  const validStatuses = ['draft', 'submitted', 'approved', 'rejected'];
  if (status && !validStatuses.includes(status)) {
    throw new Error(`Status phải là một trong: ${validStatuses.join(', ')}`);
  }
  const id = uuidv4();
  await db.query(
    "INSERT INTO courses (id, center_id, category_id, title, summary, image_url, content, price_min, price_max, modality, status, is_deleted, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, UTC_TIMESTAMP())",
    [id, centerId, categoryId, title, summary, imageUrl, content, priceMin, priceMax, modality, status]
  );
  return id;
}

// Lấy course theo id
async function findById(id) {
  const [rows] = await db.query(
    `SELECT 
      c.id, 
      c.center_id AS centerId, 
      c.category_id AS categoryId, 
      c.title, 
      c.summary, 
      c.image_url AS imageUrl,
      c.content, 
      c.price_min AS priceMin, 
      c.price_max AS priceMax, 
      c.modality, 
      c.status, 
      c.created_at AS createdAt,
      center.name AS centerName,
      center.logo_url AS centerLogo
    FROM courses c 
    LEFT JOIN centers center ON c.center_id = center.id 
    WHERE c.id = ? AND c.is_deleted = 0 LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

// Lấy tất cả courses với pagination và filter
async function findAll({ page = 1, limit = 10, centerId = null, categoryId = null, status = null, modality = null, search = null }) {
  const offset = (page - 1) * limit;
  let whereClause = "c.is_deleted = 0";
  let params = [];

  if (centerId) {
    whereClause += " AND c.center_id = ?";
    params.push(centerId);
  }

  if (categoryId) {
    whereClause += " AND c.category_id = ?";
    params.push(categoryId);
  }

  if (status) {
    whereClause += " AND c.status = ?";
    params.push(status);
  }

  if (modality) {
    whereClause += " AND c.modality = ?";
    params.push(modality);
  }

  if (search) {
    whereClause += " AND (c.title LIKE ? OR c.summary LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  params.push(limit, offset);

  const [rows] = await db.query(
    `SELECT 
      c.id, 
      c.center_id AS centerId, 
      c.category_id AS categoryId, 
      c.title, 
      c.summary, 
      c.image_url AS imageUrl,
      c.content, 
      c.price_min AS priceMin, 
      c.price_max AS priceMax, 
      c.modality, 
      c.status, 
      c.created_at AS createdAt,
      center.name AS centerName,
      center.logo_url AS centerLogo
    FROM courses c 
    LEFT JOIN centers center ON c.center_id = center.id 
    WHERE ${whereClause}
    ORDER BY c.created_at DESC 
    LIMIT ? OFFSET ?`,
    params
  );

  // Đếm tổng số records
  const countParams = params.slice(0, -2); // Remove limit and offset
  const [countRows] = await db.query(
    `SELECT COUNT(*) as total FROM courses c WHERE ${whereClause}`,
    countParams
  );

  const total = countRows[0].total;
  const totalPages = Math.ceil(total / limit);

  return {
    data: rows,
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

// Lấy courses theo center_id
async function findByCenterId(centerId, { page = 1, limit = 10, status = null }) {
  const offset = (page - 1) * limit;
  let whereClause = "c.center_id = ? AND c.is_deleted = 0";
  let params = [centerId];

  if (status) {
    whereClause += " AND c.status = ?";
    params.push(status);
  }

  params.push(limit, offset);

  const [rows] = await db.query(
    `SELECT 
      c.id, 
      c.center_id AS centerId, 
      c.category_id AS categoryId, 
      c.title, 
      c.summary, 
      c.image_url AS imageUrl,
      c.content, 
      c.price_min AS priceMin, 
      c.price_max AS priceMax, 
      c.modality, 
      c.status, 
      c.created_at AS createdAt
    FROM courses c 
    WHERE ${whereClause}
    ORDER BY c.created_at DESC 
    LIMIT ? OFFSET ?`,
    params
  );

  // Đếm tổng số records
  const countParams = params.slice(0, -2);
  const [countRows] = await db.query(
    `SELECT COUNT(*) as total FROM courses c WHERE ${whereClause}`,
    countParams
  );

  const total = countRows[0].total;
  const totalPages = Math.ceil(total / limit);

  return {
    data: rows,
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

// Cập nhật course
async function updateById(id, { centerId, categoryId, title, summary, imageUrl, content, priceMin, priceMax, modality, status }) {
  const fields = [];
  const params = [];

  if (centerId !== undefined) {
    fields.push("center_id = ?");
    params.push(centerId);
  }

  if (categoryId !== undefined) {
    fields.push("category_id = ?");
    params.push(categoryId);
  }

  if (title !== undefined) {
    fields.push("title = ?");
    params.push(title);
  }

  if (summary !== undefined) {
    fields.push("summary = ?");
    params.push(summary);
  }

  if (imageUrl !== undefined) {
    fields.push("image_url = ?");
    params.push(imageUrl);
  }

  if (content !== undefined) {
    fields.push("content = ?");
    params.push(content);
  }

  if (priceMin !== undefined) {
    fields.push("price_min = ?");
    params.push(priceMin);
  }

  if (priceMax !== undefined) {
    fields.push("price_max = ?");
    params.push(priceMax);
  }

  if (modality !== undefined) {
    fields.push("modality = ?");
    params.push(modality);
  }

  if (status !== undefined) {
    fields.push("status = ?");
    params.push(status);
  }

  if (fields.length === 0) {
    throw new Error("Không có trường nào để cập nhật");
  }

  fields.push("updated_at = UTC_TIMESTAMP()");
  params.push(id);

  const [result] = await db.query(
    `UPDATE courses SET ${fields.join(", ")} WHERE id = ? AND is_deleted = 0`,
    params
  );

  return result.affectedRows > 0;
}

// Xóa mềm course
async function deleteById(id) {
  const [result] = await db.query(
    "UPDATE courses SET is_deleted = 1, updated_at = UTC_TIMESTAMP() WHERE id = ? AND is_deleted = 0",
    [id]
  );
  return result.affectedRows > 0;
}

// Kiểm tra course có tồn tại và thuộc về center không
async function existsForCenter(courseId, centerId) {
  const [rows] = await db.query(
    "SELECT id FROM courses WHERE id = ? AND center_id = ? AND is_deleted = 0 LIMIT 1",
    [courseId, centerId]
  );
  return rows.length > 0;
}

// Đếm số courses theo center
async function countByCenterId(centerId, status = null) {
  let whereClause = "center_id = ? AND is_deleted = 0";
  let params = [centerId];

  if (status) {
    whereClause += " AND status = ?";
    params.push(status);
  }

  const [rows] = await db.query(
    `SELECT COUNT(*) as total FROM courses WHERE ${whereClause}`,
    params
  );

  return rows[0].total;
}

module.exports = {
  create,
  findById,
  findAll,
  findByCenterId,
  updateById,
  deleteById,
  existsForCenter,
  countByCenterId
};