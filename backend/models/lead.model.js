const db = require('../config/db');

// Tạo lead mới
async function create(leadData) {
  const { v4: uuidv4 } = require('uuid');
  const id = uuidv4();
  
  const { courseId, scheduleId, studentId, name, email, phone, note, consentAt, status = 'new' } = leadData;
  
  // Convert ISO datetime to MySQL DATETIME format if consentAt is provided
  let mysqlConsentAt = null;
  if (consentAt) {
    const date = new Date(consentAt);
    mysqlConsentAt = date.toISOString().slice(0, 19).replace('T', ' ');
  }
  
  await db.query(`
    INSERT INTO leads (
      id, course_id, schedule_id, student_id, name, email, phone, note, consent_at, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `, [id, courseId, scheduleId, studentId, name, email, phone, note, mysqlConsentAt, status]);
  
  return id;
}

// Tìm lead theo ID
async function findById(id) {
  const [rows] = await db.query(`
    SELECT 
      l.*,
      c.title AS courseTitle,
      ce.name AS centerName,
      s.start_date AS scheduleStartDate,
      s.end_date AS scheduleEndDate,
      u.name AS studentName,
      u.email AS studentEmail
    FROM leads l
    LEFT JOIN courses c ON l.course_id = c.id
    LEFT JOIN centers ce ON c.center_id = ce.id
    LEFT JOIN schedules s ON l.schedule_id = s.id
    LEFT JOIN users u ON l.student_id = u.id
    WHERE l.id = ?
  `, [id]);
  
  return rows[0] || null;
}

// Lấy tất cả leads với filter
async function findAll({ page = 1, limit = 10, status, courseId, centerId }) {
  const offset = (page - 1) * limit;
  
  let whereClause = "WHERE 1=1";
  const params = [];
  
  if (status) {
    whereClause += " AND l.status = ?";
    params.push(status);
  }
  
  if (courseId) {
    whereClause += " AND l.course_id = ?";
    params.push(courseId);
  }
  
  if (centerId) {
    whereClause += " AND c.center_id = ?";
    params.push(centerId);
  }
  
  params.push(limit, offset);
  
  const [rows] = await db.query(`
    SELECT 
      l.*,
      c.title AS courseTitle,
      ce.name AS centerName,
      s.start_date AS scheduleStartDate,
      u.name AS studentName
    FROM leads l
    LEFT JOIN courses c ON l.course_id = c.id
    LEFT JOIN centers ce ON c.center_id = ce.id
    LEFT JOIN schedules s ON l.schedule_id = s.id
    LEFT JOIN users u ON l.student_id = u.id
    ${whereClause}
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?
  `, params);
  
  // Count total
  const countParams = params.slice(0, -2);
  const [countRows] = await db.query(`
    SELECT COUNT(*) AS total 
    FROM leads l
    LEFT JOIN courses c ON l.course_id = c.id
    ${whereClause}
  `, countParams);
  
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

// Lấy leads theo course ID
async function findByCourseId(courseId, { page = 1, limit = 10, status }) {
  const offset = (page - 1) * limit;
  
  let whereClause = "WHERE l.course_id = ?";
  const params = [courseId];
  
  if (status) {
    whereClause += " AND l.status = ?";
    params.push(status);
  }
  
  params.push(limit, offset);
  
  const [rows] = await db.query(`
    SELECT 
      l.*,
      s.start_date AS scheduleStartDate,
      u.name AS studentName
    FROM leads l
    LEFT JOIN schedules s ON l.schedule_id = s.id
    LEFT JOIN users u ON l.student_id = u.id
    ${whereClause}
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?
  `, params);
  
  const countParams = params.slice(0, -2);
  const [countRows] = await db.query(`
    SELECT COUNT(*) AS total FROM leads l ${whereClause}
  `, countParams);
  
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

// Lấy leads theo center ID
async function findByCenterId(centerId, { page = 1, limit = 10, status }) {
  const offset = (page - 1) * limit;
  
  let whereClause = "WHERE c.center_id = ?";
  const params = [centerId];
  
  if (status) {
    whereClause += " AND l.status = ?";
    params.push(status);
  }
  
  params.push(limit, offset);
  
  const [rows] = await db.query(`
    SELECT 
      l.*,
      c.title AS courseTitle,
      s.start_date AS scheduleStartDate,
      u.name AS studentName
    FROM leads l
    LEFT JOIN courses c ON l.course_id = c.id
    LEFT JOIN schedules s ON l.schedule_id = s.id
    LEFT JOIN users u ON l.student_id = u.id
    ${whereClause}
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?
  `, params);
  
  const countParams = params.slice(0, -2);
  const [countRows] = await db.query(`
    SELECT COUNT(*) AS total 
    FROM leads l
    LEFT JOIN courses c ON l.course_id = c.id
    ${whereClause}
  `, countParams);
  
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

// Cập nhật lead
async function updateById(id, updateData) {
  const { name, email, phone, note, status, consentAt } = updateData;
  
  const [result] = await db.query(`
    UPDATE leads 
    SET name = ?, email = ?, phone = ?, note = ?, status = ?, consent_at = ?
    WHERE id = ?
  `, [name, email, phone, note, status, consentAt, id]);
  
  return result.affectedRows > 0;
}

// Cập nhật status lead
async function updateStatus(id, status) {
  const [result] = await db.query(`
    UPDATE leads SET status = ? WHERE id = ?
  `, [status, id]);
  
  return result.affectedRows > 0;
}

// Xóa lead (soft delete nếu có field is_deleted, hard delete nếu không)
async function deleteById(id) {
  const [result] = await db.query(`
    DELETE FROM leads WHERE id = ?
  `, [id]);
  
  return result.affectedRows > 0;
}

// Đếm leads theo status
async function countByStatus(centerId) {
  const [rows] = await db.query(`
    SELECT 
      l.status,
      COUNT(*) as count
    FROM leads l
    LEFT JOIN courses c ON l.course_id = c.id
    WHERE c.center_id = ?
    GROUP BY l.status
  `, [centerId]);
  
  return rows.reduce((acc, row) => {
    acc[row.status] = row.count;
    return acc;
  }, {});
}

module.exports = {
  create,
  findById,
  findAll,
  findByCourseId,
  findByCenterId,
  updateById,
  updateStatus,
  deleteById,
  countByStatus
};