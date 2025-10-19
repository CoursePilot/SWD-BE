const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

// Tạo schedule mới
async function create({ courseId, startDate, endDate, seats, location, status = 'open' }) {
  // Validate status
  const validStatuses = ['open', 'full', 'cancelled'];
  if (status && !validStatuses.includes(status)) {
    throw new Error(`Status phải là một trong: ${validStatuses.join(', ')}`);
  }

  const id = uuidv4();
  await db.query(
    "INSERT INTO schedules (id, course_id, start_date, end_date, seats, location, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, courseId, startDate, endDate, seats, location, status]
  );
  return id;
}

// Lấy schedule theo id
async function findById(id) {
  const [rows] = await db.query(
    `SELECT 
      s.id, 
      s.course_id AS courseId, 
      s.start_date AS startDate, 
      s.end_date AS endDate, 
      s.seats, 
      s.location, 
      s.status,
      c.title AS courseTitle,
      c.summary AS courseSummary
    FROM schedules s 
    LEFT JOIN courses c ON s.course_id = c.id 
    WHERE s.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

// Lấy tất cả schedules với pagination và filter
async function findAll({ page = 1, limit = 10, courseId = null, status = null, startDate = null, endDate = null }) {
  const offset = (page - 1) * limit;
  let whereClause = "1=1";
  let params = [];

  if (courseId) {
    whereClause += " AND s.course_id = ?";
    params.push(courseId);
  }

  if (status) {
    whereClause += " AND s.status = ?";
    params.push(status);
  }

  if (startDate) {
    whereClause += " AND s.start_date >= ?";
    params.push(startDate);
  }

  if (endDate) {
    whereClause += " AND s.end_date <= ?";
    params.push(endDate);
  }

  params.push(limit, offset);

  const [rows] = await db.query(
    `SELECT 
      s.id, 
      s.course_id AS courseId, 
      s.start_date AS startDate, 
      s.end_date AS endDate, 
      s.seats, 
      s.location, 
      s.status,
      c.title AS courseTitle,
      c.summary AS courseSummary
    FROM schedules s 
    LEFT JOIN courses c ON s.course_id = c.id 
    WHERE ${whereClause}
    ORDER BY s.start_date ASC 
    LIMIT ? OFFSET ?`,
    params
  );

  // Đếm tổng số records
  const countParams = params.slice(0, -2); // Remove limit and offset
  const [countRows] = await db.query(
    `SELECT COUNT(*) as total FROM schedules s WHERE ${whereClause}`,
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

// Lấy schedules theo course_id
async function findByCourseId(courseId, { page = 1, limit = 10, status = null }) {
  const offset = (page - 1) * limit;
  let whereClause = "s.course_id = ?";
  let params = [courseId];

  if (status) {
    whereClause += " AND s.status = ?";
    params.push(status);
  }

  params.push(limit, offset);

  const [rows] = await db.query(
    `SELECT 
      s.id, 
      s.course_id AS courseId, 
      s.start_date AS startDate, 
      s.end_date AS endDate, 
      s.seats, 
      s.location, 
      s.status
    FROM schedules s 
    WHERE ${whereClause}
    ORDER BY s.start_date ASC 
    LIMIT ? OFFSET ?`,
    params
  );

  // Đếm tổng số records
  const countParams = params.slice(0, -2);
  const [countRows] = await db.query(
    `SELECT COUNT(*) as total FROM schedules s WHERE ${whereClause}`,
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

// Cập nhật schedule
async function updateById(id, { courseId, startDate, endDate, seats, location, status }) {
  const fields = [];
  const params = [];

  if (courseId !== undefined) {
    fields.push("course_id = ?");
    params.push(courseId);
  }

  if (startDate !== undefined) {
    fields.push("start_date = ?");
    params.push(startDate);
  }

  if (endDate !== undefined) {
    fields.push("end_date = ?");
    params.push(endDate);
  }

  if (seats !== undefined) {
    fields.push("seats = ?");
    params.push(seats);
  }

  if (location !== undefined) {
    fields.push("location = ?");
    params.push(location);
  }

  if (status !== undefined) {
    // Validate status
    const validStatuses = ['open', 'full', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Status phải là một trong: ${validStatuses.join(', ')}`);
    }
    fields.push("status = ?");
    params.push(status);
  }

  if (fields.length === 0) {
    throw new Error("Không có trường nào để cập nhật");
  }

  params.push(id);

  const [result] = await db.query(
    `UPDATE schedules SET ${fields.join(", ")} WHERE id = ?`,
    params
  );

  return result.affectedRows > 0;
}

// Xóa schedule
async function deleteById(id) {
  const [result] = await db.query(
    "DELETE FROM schedules WHERE id = ?",
    [id]
  );
  return result.affectedRows > 0;
}

// Kiểm tra schedule có tồn tại không
async function exists(id) {
  const [rows] = await db.query(
    "SELECT id FROM schedules WHERE id = ? LIMIT 1",
    [id]
  );
  return rows.length > 0;
}

// Kiểm tra schedule có thuộc về course không
async function existsForCourse(scheduleId, courseId) {
  const [rows] = await db.query(
    "SELECT id FROM schedules WHERE id = ? AND course_id = ? LIMIT 1",
    [scheduleId, courseId]
  );
  return rows.length > 0;
}

// Đếm số schedules theo course
async function countByCourseId(courseId, status = null) {
  let whereClause = "course_id = ?";
  let params = [courseId];

  if (status) {
    whereClause += " AND status = ?";
    params.push(status);
  }

  const [rows] = await db.query(
    `SELECT COUNT(*) as total FROM schedules WHERE ${whereClause}`,
    params
  );

  return rows[0].total;
}

// Lấy schedules sắp diễn ra (trong vòng 30 ngày)
async function findUpcoming({ page = 1, limit = 10, courseId = null }) {
  const offset = (page - 1) * limit;
  let whereClause = "s.start_date >= CURDATE() AND s.start_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND s.status = 'open'";
  let params = [];

  if (courseId) {
    whereClause += " AND s.course_id = ?";
    params.push(courseId);
  }

  params.push(limit, offset);

  const [rows] = await db.query(
    `SELECT 
      s.id, 
      s.course_id AS courseId, 
      s.start_date AS startDate, 
      s.end_date AS endDate, 
      s.seats, 
      s.location, 
      s.status,
      c.title AS courseTitle,
      c.summary AS courseSummary
    FROM schedules s 
    LEFT JOIN courses c ON s.course_id = c.id 
    WHERE ${whereClause}
    ORDER BY s.start_date ASC 
    LIMIT ? OFFSET ?`,
    params
  );

  // Đếm tổng số records
  const countParams = params.slice(0, -2);
  const [countRows] = await db.query(
    `SELECT COUNT(*) as total FROM schedules s WHERE ${whereClause}`,
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

module.exports = {
  create,
  findById,
  findAll,
  findByCourseId,
  updateById,
  deleteById,
  exists,
  existsForCourse,
  countByCourseId,
  findUpcoming
};