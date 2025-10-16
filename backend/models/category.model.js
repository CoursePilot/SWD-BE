const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

// Tạo category mới
async function create({ name }) {
  const id = uuidv4();
  await db.query(
    "INSERT INTO categories (id, name) VALUES (?, ?)",
    [id, name]
  );
  return id;
}

// Lấy category theo id
async function findById(id) {
  const [rows] = await db.query(
    "SELECT id, name FROM categories WHERE id = ? AND is_deleted = 0 LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

// Lấy category theo name
async function findByName(name) {
  const [rows] = await db.query(
    "SELECT id, name FROM categories WHERE name = ? AND is_deleted = 0 LIMIT 1",
    [name]
  );
  return rows[0] || null;
}

// Lấy tất cả categories với pagination
async function findAll({ page = 1, limit = 50, search = null }) {
  const offset = (page - 1) * limit;
  let whereClause = "is_deleted = 0";
  let params = [];

  if (search) {
    whereClause += " AND name LIKE ?";
    params.push(`%${search}%`);
  }

  params.push(limit, offset);

  const [rows] = await db.query(
    `SELECT id, name 
     FROM categories 
     WHERE ${whereClause}
     ORDER BY name ASC 
     LIMIT ? OFFSET ?`,
    params
  );

  // Đếm tổng số records
  const countParams = params.slice(0, -2); // Remove limit and offset
  const [countRows] = await db.query(
    `SELECT COUNT(*) as total FROM categories WHERE ${whereClause}`,
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

// Lấy tất cả categories (không phân trang - dùng cho dropdown)
async function findAllSimple() {
  const [rows] = await db.query(
    "SELECT id, name FROM categories WHERE is_deleted = 0 ORDER BY name ASC"
  );
  return rows;
}

// Cập nhật category
async function updateById(id, { name }) {
  const [result] = await db.query(
    "UPDATE categories SET name = ? WHERE id = ?",
    [name, id]
  );
  return result.affectedRows > 0;
}

// Xóa category (chỉ nếu không có course nào sử dụng)
async function deleteById(id) {
  // Kiểm tra xem có course nào đang sử dụng category này không
  const [courseRows] = await db.query(
    "SELECT COUNT(*) as count FROM courses WHERE category_id = ? AND is_deleted = 0",
    [id]
  );

  if (courseRows[0].count > 0) {
    throw new Error("Không thể xóa danh mục đang được sử dụng bởi các khóa học");
  }

  // Sử dụng soft delete thay vì xóa hoàn toàn
  const [result] = await db.query(
    "UPDATE categories SET is_deleted = 1 WHERE id = ?",
    [id]
  );
  return result.affectedRows > 0;
}

// Kiểm tra category có tồn tại không
async function exists(id) {
  const [rows] = await db.query(
    "SELECT id FROM categories WHERE id = ? AND is_deleted = 0 LIMIT 1",
    [id]
  );
  return rows.length > 0;
}

// Kiểm tra tên category có bị trùng không (cho validation)
async function nameExists(name, excludeId = null) {
  let query = "SELECT id FROM categories WHERE name = ? AND is_deleted = 0";
  let params = [name];

  if (excludeId) {
    query += " AND id != ?";
    params.push(excludeId);
  }

  const [rows] = await db.query(query + " LIMIT 1", params);
  return rows.length > 0;
}

// Đếm số courses theo category
async function countCourses(categoryId) {
  const [rows] = await db.query(
    "SELECT COUNT(*) as total FROM courses WHERE category_id = ? AND is_deleted = 0",
    [categoryId]
  );
  return rows[0].total;
}

// Lấy categories có courses (dùng cho filter)
async function findWithCourses() {
  const [rows] = await db.query(
    `SELECT DISTINCT c.id, c.name, COUNT(co.id) as courseCount
     FROM categories c
     INNER JOIN courses co ON c.id = co.category_id AND co.is_deleted = 0
     WHERE c.is_deleted = 0
     GROUP BY c.id, c.name
     ORDER BY c.name ASC`
  );
  return rows;
}

module.exports = {
  create,
  findById,
  findByName,
  findAll,
  findAllSimple,
  updateById,
  deleteById,
  exists,
  nameExists,
  countCourses,
  findWithCourses
};