const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

// Theo dõi khóa học hoặc trung tâm
async function create({ userId, courseId, centerId }) {
  const id = uuidv4();
  
  // Validate: phải có course_id HOẶC center_id, không được cả 2 hoặc không có
  if ((!courseId && !centerId) || (courseId && centerId)) {
    throw new Error('Phải chọn theo dõi khóa học HOẶC trung tâm');
  }
  
  try {
    if (courseId) {
      await db.query(
        "INSERT INTO follows (id, user_id, course_id, created_at) VALUES (?, ?, ?, UTC_TIMESTAMP())",
        [id, userId, courseId]
      );
    } else {
      await db.query(
        "INSERT INTO follows (id, user_id, center_id, created_at) VALUES (?, ?, ?, UTC_TIMESTAMP())",
        [id, userId, centerId]
      );
    }
    return id;
  } catch (error) {
    // Kiểm tra lỗi duplicate key (đã follow rồi)
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error(courseId ? 'Bạn đã theo dõi khóa học này rồi' : 'Bạn đã theo dõi trung tâm này rồi');
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

// Bỏ theo dõi trung tâm
async function deleteByUserAndCenter(userId, centerId) {
  const [result] = await db.query(
    "DELETE FROM follows WHERE user_id = ? AND center_id = ?",
    [userId, centerId]
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

// Kiểm tra user đã follow center chưa
async function isFollowingCenter(userId, centerId) {
  const [rows] = await db.query(
    "SELECT id FROM follows WHERE user_id = ? AND center_id = ? LIMIT 1",
    [userId, centerId]
  );
  return rows.length > 0;
}

// Lấy danh sách khóa học user đang follow với pagination
async function findByUserId(userId, { page = 1, limit = 10 }) {
  // Parse to integers
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
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
      c.image_url AS courseImage,
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
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}

// Tìm kiếm khóa học user đang follow với filter
async function searchByUserId(userId, { page = 1, limit = 10, keyword, status, modality, centerId }) {
  // Parse to integers
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  const offset = (page - 1) * limit;
  
  let whereClause = "f.user_id = ? AND c.is_deleted = 0";
  const params = [userId];
  
  // Filter by keyword (search in title, summary)
  if (keyword) {
    whereClause += " AND (c.title LIKE ? OR c.summary LIKE ?)";
    const searchPattern = `%${keyword}%`;
    params.push(searchPattern, searchPattern);
  }
  
  // Filter by status
  if (status) {
    whereClause += " AND c.status = ?";
    params.push(status);
  }
  
  // Filter by modality
  if (modality) {
    whereClause += " AND c.modality = ?";
    params.push(modality);
  }
  
  // Filter by centerId
  if (centerId) {
    whereClause += " AND c.center_id = ?";
    params.push(centerId);
  }
  
  params.push(limit, offset);
  
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
      c.image_url AS courseImage,
      center.id AS centerId,
      center.name AS centerName,
      center.logo_url AS centerLogo
    FROM follows f
    LEFT JOIN courses c ON f.course_id = c.id
    LEFT JOIN centers center ON c.center_id = center.id
    WHERE ${whereClause}
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?`,
    params
  );

  // Count total
  const countParams = params.slice(0, -2);
  const [countRows] = await db.query(
    `SELECT COUNT(*) as total 
     FROM follows f 
     LEFT JOIN courses c ON f.course_id = c.id 
     WHERE ${whereClause}`,
    countParams
  );

  const total = countRows[0].total;
  const totalPages = Math.ceil(total / limit);

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}

// Lấy danh sách centers mà user đang follow với pagination
async function findCentersByUserId(userId, { page = 1, limit = 10 }) {
  // Parse to integers
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  const offset = (page - 1) * limit;
  
  const [rows] = await db.query(
    `SELECT 
      f.id,
      f.center_id AS centerId,
      f.created_at AS followedAt,
      c.name AS centerName,
      c.logo_url AS centerLogo,
      c.phone AS centerPhone,
      c.address AS centerAddress,
      c.website_url AS centerWebsite,
      c.description AS centerDescription,
      c.verified AS centerVerified,
      c.status AS centerStatus,
      u.name AS ownerName,
      u.email AS ownerEmail
    FROM follows f
    LEFT JOIN centers c ON f.center_id = c.id
    LEFT JOIN users u ON c.user_id = u.id
    WHERE f.user_id = ? AND f.center_id IS NOT NULL AND c.is_deleted = 0
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );

  // Đếm tổng số records
  const [countRows] = await db.query(
    `SELECT COUNT(*) as total 
     FROM follows f 
     LEFT JOIN centers c ON f.center_id = c.id 
     WHERE f.user_id = ? AND f.center_id IS NOT NULL AND c.is_deleted = 0`,
    [userId]
  );

  const total = countRows[0].total;
  const totalPages = Math.ceil(total / limit);

  return {
    data: rows,
    pagination: {
      page,
      limit,
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

// Đếm số lượng follow của một trung tâm
async function countByCenterId(centerId) {
  const [rows] = await db.query(
    "SELECT COUNT(*) as total FROM follows WHERE center_id = ?",
    [centerId]
  );
  return rows[0].total;
}

// Lấy danh sách followers của một trung tâm
async function findByCenterId(centerId, { page = 1, limit = 10 }) {
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
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
    WHERE f.center_id = ?
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?`,
    [centerId, limit, offset]
  );

  const [countRows] = await db.query(
    "SELECT COUNT(*) as total FROM follows WHERE center_id = ?",
    [centerId]
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

// Lấy danh sách user_id theo dõi một trung tâm (để gửi thông báo)
async function getUserIdsByCenter(centerId) {
  const [rows] = await db.query(
    `SELECT DISTINCT user_id 
     FROM follows 
     WHERE center_id = ?`,
    [centerId]
  );
  return rows.map(row => row.user_id);
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
  deleteByUserAndCenter,
  isFollowing,
  isFollowingCenter,
  findByUserId,
  findCentersByUserId,
  searchByUserId,
  findByCourseId,
  findByCenterId,
  countByCourseId,
  countByCenterId,
  countByUserId,
  getUserIdsByCenter,
  getTopFollowedCourses,
  getRecentFollows,
  deleteById,
  findById
};