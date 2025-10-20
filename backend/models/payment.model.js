const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

// Tạo payment mới
async function create({ subscriptionId, amount, method, status, invoiceNo = null, transactionId = null }) {
  const id = uuidv4();
  
  await db.query(
    "INSERT INTO payments (id, subscription_id, amount, method, status, invoice_no, transaction_id, paid_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)",
    [id, subscriptionId, amount, method, status, invoiceNo, transactionId, status === 'paid' ? new Date() : null]
  );
  return id;
}

// Lấy payment theo id
async function findById(id) {
  const [rows] = await db.query(
    `SELECT 
      p.id, 
      p.subscription_id AS subscriptionId, 
      p.amount, 
      p.method, 
      p.status, 
      p.invoice_no AS invoiceNo, 
      p.transaction_id AS transactionId, 
      p.paid_at AS paidAt,
      p.expired_at AS expiredAt,
      s.center_id AS centerId,
      s.plan_id AS planId,
      plan.name AS planName,
      plan.price AS planPrice,
      center.name AS centerName
    FROM payments p 
    LEFT JOIN subscriptions s ON p.subscription_id = s.id 
    LEFT JOIN plans plan ON s.plan_id = plan.id
    LEFT JOIN centers center ON s.center_id = center.id
    WHERE p.id = ? AND p.is_deleted = 0 LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

// Lấy payment theo transaction_id (MoMo)
async function findByTransactionId(transactionId) {
  const [rows] = await db.query(
    `SELECT 
      p.id, 
      p.subscription_id AS subscriptionId, 
      p.amount, 
      p.method, 
      p.status, 
      p.invoice_no AS invoiceNo, 
      p.transaction_id AS transactionId, 
      p.paid_at AS paidAt,
      p.expired_at AS expiredAt
    FROM payments p 
    WHERE p.transaction_id = ? AND p.is_deleted = 0 LIMIT 1`,
    [transactionId]
  );
  return rows[0] || null;
}

// Lấy tất cả payments với pagination và filter
async function findAll({ page = 1, limit = 10, centerId = null, status = null, method = null }) {
  const offset = (page - 1) * limit;
  let whereClause = "p.is_deleted = 0";
  let params = [];

  if (centerId) {
    whereClause += " AND s.center_id = ?";
    params.push(centerId);
  }

  if (status) {
    whereClause += " AND p.status = ?";
    params.push(status);
  }

  if (method) {
    whereClause += " AND p.method = ?";
    params.push(method);
  }

  params.push(limit, offset);

  const [rows] = await db.query(
    `SELECT 
      p.id, 
      p.subscription_id AS subscriptionId, 
      p.amount, 
      p.method, 
      p.status, 
      p.invoice_no AS invoiceNo, 
      p.transaction_id AS transactionId, 
      p.paid_at AS paidAt,
      p.expired_at AS expiredAt,
      s.center_id AS centerId,
      s.plan_id AS planId,
      plan.name AS planName,
      plan.price AS planPrice,
      center.name AS centerName
    FROM payments p 
    LEFT JOIN subscriptions s ON p.subscription_id = s.id 
    LEFT JOIN plans plan ON s.plan_id = plan.id
    LEFT JOIN centers center ON s.center_id = center.id
    WHERE ${whereClause}
    ORDER BY p.paid_at DESC, p.id DESC
    LIMIT ? OFFSET ?`,
    params
  );

  // Đếm tổng số records
  const countParams = params.slice(0, -2); // Remove limit and offset
  const [countRows] = await db.query(
    `SELECT COUNT(*) as total FROM payments p 
     LEFT JOIN subscriptions s ON p.subscription_id = s.id 
     WHERE ${whereClause}`,
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

// Lấy payments theo subscription_id
async function findBySubscriptionId(subscriptionId, { page = 1, limit = 10, status = null }) {
  const offset = (page - 1) * limit;
  let whereClause = "p.subscription_id = ? AND p.is_deleted = 0";
  let params = [subscriptionId];

  if (status) {
    whereClause += " AND p.status = ?";
    params.push(status);
  }

  params.push(limit, offset);

  const [rows] = await db.query(
    `SELECT 
      p.id, 
      p.subscription_id AS subscriptionId, 
      p.amount, 
      p.method, 
      p.status, 
      p.invoice_no AS invoiceNo, 
      p.transaction_id AS transactionId, 
      p.paid_at AS paidAt,
      p.expired_at AS expiredAt
    FROM payments p 
    WHERE ${whereClause}
    ORDER BY p.paid_at DESC, p.id DESC
    LIMIT ? OFFSET ?`,
    params
  );

  // Đếm tổng số records
  const countParams = params.slice(0, -2);
  const [countRows] = await db.query(
    `SELECT COUNT(*) as total FROM payments p WHERE ${whereClause}`,
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

// Cập nhật payment status
async function updateStatus(id, { status, transactionId = null, paidAt = null, expiredAt = null }) {
  const fields = ["status = ?"];
  const params = [status];

  if (transactionId !== null) {
    fields.push("transaction_id = ?");
    params.push(transactionId);
  }

  if (paidAt !== null) {
    fields.push("paid_at = ?");
    params.push(paidAt);
  }

  if (expiredAt !== null) {
    fields.push("expired_at = ?");
    params.push(expiredAt);
  }

  params.push(id);

  const [result] = await db.query(
    `UPDATE payments SET ${fields.join(", ")} WHERE id = ? AND is_deleted = 0`,
    params
  );

  return result.affectedRows > 0;
}

// Cập nhật payment theo transaction_id (callback từ MoMo)
async function updateByTransactionId(transactionId, { status, paidAt = null, expiredAt = null }) {
  const fields = ["status = ?"];
  const params = [status];

  if (paidAt !== null) {
    fields.push("paid_at = ?");
    params.push(paidAt);
  }

  if (expiredAt !== null) {
    fields.push("expired_at = ?");
    params.push(expiredAt);
  }

  params.push(transactionId);

  const [result] = await db.query(
    `UPDATE payments SET ${fields.join(", ")} WHERE transaction_id = ? AND is_deleted = 0`,
    params
  );

  return result.affectedRows > 0;
}

// Soft delete payment
async function deleteById(id) {
  const [result] = await db.query(
    "UPDATE payments SET is_deleted = 1 WHERE id = ? AND is_deleted = 0",
    [id]
  );
  return result.affectedRows > 0;
}

// Kiểm tra payment có tồn tại không
async function exists(id) {
  const [rows] = await db.query(
    "SELECT id FROM payments WHERE id = ? AND is_deleted = 0 LIMIT 1",
    [id]
  );
  return rows.length > 0;
}

// Đếm số payments theo center
async function countByCenterId(centerId, status = null) {
  let whereClause = "s.center_id = ? AND p.is_deleted = 0";
  let params = [centerId];

  if (status) {
    whereClause += " AND p.status = ?";
    params.push(status);
  }

  const [rows] = await db.query(
    `SELECT COUNT(*) as total FROM payments p 
     LEFT JOIN subscriptions s ON p.subscription_id = s.id 
     WHERE ${whereClause}`,
    params
  );

  return rows[0].total;
}

// Lấy tổng doanh thu theo center
async function getRevenueByCenterId(centerId, { startDate = null, endDate = null } = {}) {
  let whereClause = "s.center_id = ? AND p.status = 'completed' AND p.is_deleted = 0";
  let params = [centerId];

  if (startDate) {
    whereClause += " AND p.paid_at >= ?";
    params.push(startDate);
  }

  if (endDate) {
    whereClause += " AND p.paid_at <= ?";
    params.push(endDate);
  }

  const [rows] = await db.query(
    `SELECT 
      COUNT(*) as totalPayments,
      COALESCE(SUM(p.amount), 0) as totalRevenue,
      AVG(p.amount) as averageAmount
    FROM payments p 
    LEFT JOIN subscriptions s ON p.subscription_id = s.id 
    WHERE ${whereClause}`,
    params
  );

  return rows[0];
}

// Lấy payments sắp hết hạn
async function findExpiringSoon({ days = 3, page = 1, limit = 10 }) {
  const offset = (page - 1) * limit;
  
  const [rows] = await db.query(
    `SELECT 
      p.id, 
      p.subscription_id AS subscriptionId, 
      p.amount, 
      p.method, 
      p.status, 
      p.invoice_no AS invoiceNo, 
      p.transaction_id AS transactionId, 
      p.paid_at AS paidAt,
      p.expired_at AS expiredAt,
      s.center_id AS centerId,
      center.name AS centerName
    FROM payments p 
    LEFT JOIN subscriptions s ON p.subscription_id = s.id 
    LEFT JOIN centers center ON s.center_id = center.id
    WHERE p.status = 'pending' 
      AND p.expired_at IS NOT NULL 
      AND p.expired_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? DAY)
      AND p.is_deleted = 0
    ORDER BY p.expired_at ASC
    LIMIT ? OFFSET ?`,
    [days, limit, offset]
  );

  // Đếm tổng số records
  const [countRows] = await db.query(
    `SELECT COUNT(*) as total FROM payments p 
     WHERE p.status = 'pending' 
       AND p.expired_at IS NOT NULL 
       AND p.expired_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? DAY)
       AND p.is_deleted = 0`,
    [days]
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
  findByTransactionId,
  findAll,
  findBySubscriptionId,
  updateStatus,
  updateByTransactionId,
  deleteById,
  exists,
  countByCenterId,
  getRevenueByCenterId,
  findExpiringSoon
};