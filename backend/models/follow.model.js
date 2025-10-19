const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

// Theo dõi khóa học
async function create({ userId, courseId }) {
  const id = uuidv4();
  
  try {
    await db.query(
      "INSERT INTO follows (id, user_id, course_id, created_at) VALUES (?, ?, ?, UTC_TIMESTAMP())",
      [id, userId, courseId]
    );
    return id;
  } catch (error) {
    // Kiểm tra lỗi duplicate key (đã follow rồi)
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error('Bạn đã theo dõi khóa học này rồi');
    }
    throw error;
  }
}

// Bỏ theo dõi khóa học
async function deleteByUserAndCourse(userId, courseId) {
  const [result] = await db.query(
    "DELETE FROM follows WHERE user_id = ? AND course_id = ?",
    [userId, courseId]
  );
  return result.affectedRows > 0;
}

// Kiểm tra user đã follow course chưa
async function isFollowing(userId, courseId) {
  const [rows] = await db.query(
    "SELECT id FROM follows WHERE user_id = ? AND course_id = ? LIMIT 1",
    [userId, courseId]
  );
  return rows.length > 0;
}

// Lấy danh sách khóa học user đang follow với pagination
async function findByUserId(userId, { page = 1, limit = 10 }) {
  const offset = (page - 1) * limit;
  
  const [rows] = await db.query(
    `SELECT 
      f.id,
      f.course_id AS courseId,
      f.created_at AS followedAt,
      c.title AS courseTitle,
      c.summary AS courseSummary,
      c.price_min AS priceMin,
      c.price_max AS priceMax,
      c.modality,
      c.status AS courseStatus,
      center.name AS centerName,
      center.logo_url AS centerLogo
    FROM follows f
    LEFT JOIN courses c ON f.course_id = c.id
    LEFT JOIN centers center ON c.center_id = center.id
    WHERE f.user_id = ? AND c.is_deleted = 0
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );

  // Đếm tổng số records
  const [countRows] = await db.query(
    `SELECT COUNT(*) as total 
     FROM follows f 
     LEFT JOIN courses c ON f.course_id = c.id 
     WHERE f.user_id = ? AND c.is_deleted = 0`,
    [userId]
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

// Lấy danh sách user đang follow course với pagination
async function findByCourseId(courseId, { page = 1, limit = 10 }) {
  const offset = (page - 1) * limit;
  
  const [rows] = await db.query(
    `SELECT 
      f.id,
      f.user_id AS userId,
      f.created_at AS followedAt,
      u.name AS userName,
      u.email AS userEmail,
      u.avatar_url AS userAvatar
    FROM follows f
    LEFT JOIN users u ON f.user_id = u.id
    WHERE f.course_id = ?
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?`,
    [courseId, limit, offset]
  );

  // Đếm tổng số records
  const [countRows] = await db.query(
    "SELECT COUNT(*) as total FROM follows WHERE course_id = ?",
    [courseId]
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

// Đếm số lượng follow của một khóa học
async function countByCourseId(courseId) {
  const [rows] = await db.query(
    "SELECT COUNT(*) as total FROM follows WHERE course_id = ?",
    [courseId]
  );
  return rows[0].total;
}

// Đếm số lượng khóa học user đang follow
async function countByUserId(userId) {
  const [rows] = await db.query(
    `SELECT COUNT(*) as total 
     FROM follows f 
     LEFT JOIN courses c ON f.course_id = c.id 
     WHERE f.user_id = ? AND c.is_deleted = 0`,
    [userId]
  );
  return rows[0].total;
}

// Lấy thống kê follow theo khóa học (top courses được follow nhiều nhất)
async function getTopFollowedCourses({ limit = 10 }) {
  const [rows] = await db.query(
    `SELECT 
      c.id AS courseId,
      c.title AS courseTitle,
      c.summary AS courseSummary,
      c.price_min AS priceMin,
      c.price_max AS priceMax,
      center.name AS centerName,
      COUNT(f.id) AS followCount
    FROM courses c
    LEFT JOIN follows f ON c.id = f.course_id
    LEFT JOIN centers center ON c.center_id = center.id
    WHERE c.is_deleted = 0
    GROUP BY c.id, c.title, c.summary, c.price_min, c.price_max, center.name
    ORDER BY followCount DESC, c.title ASC
    LIMIT ?`,
    [limit]
  );
  
  return rows;
}

// Lấy danh sách follow mới nhất
async function getRecentFollows({ limit = 10 }) {
  const [rows] = await db.query(
    `SELECT 
      f.id,
      f.user_id AS userId,
      f.course_id AS courseId,
      f.created_at AS followedAt,
      u.name AS userName,
      u.email AS userEmail,
      c.title AS courseTitle,
      c.summary AS courseSummary,
      center.name AS centerName
    FROM follows f
    LEFT JOIN users u ON f.user_id = u.id
    LEFT JOIN courses c ON f.course_id = c.id
    LEFT JOIN centers center ON c.center_id = center.id
    WHERE c.is_deleted = 0
    ORDER BY f.created_at DESC
    LIMIT ?`,
    [limit]
  );
  
  return rows;
}

// Xóa follow theo ID
async function deleteById(id) {
  const [result] = await db.query(
    "DELETE FROM follows WHERE id = ?",
    [id]
  );
  return result.affectedRows > 0;
}

// Tìm follow theo ID
async function findById(id) {
  const [rows] = await db.query(
    `SELECT 
      f.id,
      f.user_id AS userId,
      f.course_id AS courseId,
      f.created_at AS followedAt,
      u.name AS userName,
      u.email AS userEmail,
      c.title AS courseTitle,
      c.summary AS courseSummary,
      center.name AS centerName
    FROM follows f
    LEFT JOIN users u ON f.user_id = u.id
    LEFT JOIN courses c ON f.course_id = c.id
    LEFT JOIN centers center ON c.center_id = center.id
    WHERE f.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  create,
  deleteByUserAndCourse,
  isFollowing,
  findByUserId,
  findByCourseId,
  countByCourseId,
  countByUserId,
  getTopFollowedCourses,
  getRecentFollows,
  deleteById,
  findById
};