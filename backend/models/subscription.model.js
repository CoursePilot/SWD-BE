const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

// Lấy tất cả subscriptions của một center (phân trang)
async function findAllByCenter(centerId, { page = 1, limit = 10, status = null }) {
  const offset = (page - 1) * limit;
  let whereClause = "s.center_id = ? AND s.is_deleted = 0";
  const params = [centerId];

  if (status) {
    whereClause += " AND s.status = ?";
    params.push(status);
  }

  params.push(limit, offset);

  const [rows] = await db.query(
    `SELECT 
      s.id,
      s.center_id AS centerId,
      s.plan_id AS planId,
      s.start_at AS startAt,
      s.end_at AS endAt,
      s.lead_used AS leadUsed,
      s.post_used AS postUsed,
      s.status,
      s.auto_renew AS autoRenew,
      s.cancelled_at AS cancelledAt,
      s.reason_cancel AS reasonCancel,
      p.name AS planName,
      p.price AS planPrice,
      p.duration_days AS planDurationDays,
      p.lead_quota AS planLeadQuota,
      p.post_quota AS planPostQuota
    FROM subscriptions s
    LEFT JOIN plans p ON p.id = s.plan_id
    WHERE ${whereClause}
    ORDER BY s.start_at DESC
    LIMIT ? OFFSET ?`,
    params
  );

  const countParams = params.slice(0, -2);
  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total FROM subscriptions s WHERE ${whereClause}`,
    countParams
  );

  return {
    subscriptions: rows,
    total: countRows[0].total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(countRows[0].total / limit)
  };
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT 
      s.id,
      s.center_id AS centerId,
      s.plan_id AS planId,
      s.start_at AS startAt,
      s.end_at AS endAt,
      s.lead_used AS leadUsed,
      s.post_used AS postUsed,
      s.status,
      s.auto_renew AS autoRenew,
      s.cancelled_at AS cancelledAt,
      s.reason_cancel AS reasonCancel,
      s.is_deleted AS isDeleted,
      p.name AS planName,
      p.price AS planPrice,
      p.duration_days AS planDurationDays,
      p.lead_quota AS planLeadQuota,
      p.post_quota AS planPostQuota
    FROM subscriptions s
    LEFT JOIN plans p ON p.id = s.plan_id
    WHERE s.id = ? AND s.is_deleted = 0
    LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function create({ id, centerId, planId, startAt, endAt, status = 'active', autoRenew = 0 }) {
  const subscriptionId = id || uuidv4();
  await db.query(
    `INSERT INTO subscriptions (
      id, center_id, plan_id, start_at, end_at, lead_used, post_used, status, is_deleted, auto_renew
    ) VALUES (?, ?, ?, ?, ?, 0, 0, ?, 0, ?)`,
    [subscriptionId, centerId, planId, startAt, endAt, status, autoRenew]
  );
  return subscriptionId;
}

async function cancel(id, reason) {
  await db.query(
    `UPDATE subscriptions 
     SET status = 'cancelled', reason_cancel = ?, cancelled_at = UTC_TIMESTAMP()
     WHERE id = ? AND is_deleted = 0`,
    [reason || null, id]
  );
}

async function renew(id, { startAt, endAt }) {
  await db.query(
    `UPDATE subscriptions 
     SET start_at = ?, end_at = ?, status = 'active', lead_used = 0, post_used = 0, cancelled_at = NULL, reason_cancel = NULL
     WHERE id = ? AND is_deleted = 0`,
    [startAt, endAt, id]
  );
}

async function deleteSubscription(id) {
  await db.query(
    `UPDATE subscriptions SET is_deleted = 1 WHERE id = ?`,
    [id]
  );
}

async function updateStatus(id, status) {
  try {
    console.log(`Updating subscription ${id} to status: ${status}`);
    const [result] = await db.query(
      `UPDATE subscriptions SET status = ? WHERE id = ? AND is_deleted = 0`,
      [status, id]
    );
    console.log(`Update result: affectedRows=${result.affectedRows}, changedRows=${result.changedRows}`);
    
    if (result.affectedRows === 0) {
      console.log(`Warning: No subscription found with id ${id} or already deleted`);
    }
    
    return result;
  } catch (error) {
    console.error(`Error updating subscription ${id} status to ${status}:`, error);
    throw error;
  }
}

async function deleteById(id) {
  await deleteSubscription(id);
}

// Tìm subscription active của center
async function findActiveByCenterId(centerId) {
  const [rows] = await db.query(`
    SELECT 
      s.*,
      p.lead_quota AS planLeadQuota,
      p.post_quota AS planPostQuota,
      p.name AS planName,
      p.duration_days AS planDurationDays
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.center_id = ? AND s.status = 'active'
    ORDER BY s.start_at DESC LIMIT 1
  `, [centerId]);
  
  return rows[0] || null;
}

// Tăng lead_used counter
async function incrementLeadUsed(subscriptionId) {
  const [result] = await db.query(`
    UPDATE subscriptions 
    SET lead_used = lead_used + 1
    WHERE id = ?
  `, [subscriptionId]);
  
  return result.affectedRows > 0;
}

// Tăng post_used counter  
async function incrementPostUsed(subscriptionId) {
  const [result] = await db.query(`
    UPDATE subscriptions 
    SET post_used = post_used + 1
    WHERE id = ?
  `, [subscriptionId]);
  
  return result.affectedRows > 0;
}

// Kiểm tra và cập nhật expired subscriptions
async function checkAndUpdateExpired() {
  const [result] = await db.query(`
    UPDATE subscriptions 
    SET status = 'expired'
    WHERE status = 'active' 
    AND end_at < NOW()
  `);
  
  console.log(`Updated ${result.affectedRows} expired subscriptions`);
  return result.affectedRows;
}

// Kiểm tra quota limits và cancel subscription
async function checkAndCancelOverQuota() {
  const [result] = await db.query(`
    UPDATE subscriptions s
    JOIN plans p ON s.plan_id = p.id
    SET s.status = 'cancelled'
    WHERE s.status = 'active'
    AND (s.lead_used >= p.lead_quota OR s.post_used >= p.post_quota)
  `);
  
  console.log(`Cancelled ${result.affectedRows} over-quota subscriptions`);
  return result.affectedRows;
}

// Kiểm tra subscription có còn quota không
async function checkQuotaAvailable(centerId, type) {
  const subscription = await findActiveByCenterId(centerId);
  if (!subscription) {
    return { available: false, reason: 'No active subscription' };
  }

  if (type === 'lead') {
    const available = subscription.lead_used < subscription.planLeadQuota;
    return {
      available,
      used: subscription.lead_used,
      limit: subscription.planLeadQuota,
      remaining: subscription.planLeadQuota - subscription.lead_used,
      reason: available ? null : 'Lead quota exceeded'
    };
  }

  if (type === 'post') {
    const available = subscription.post_used < subscription.planPostQuota;
    return {
      available,
      used: subscription.post_used,
      limit: subscription.planPostQuota,
      remaining: subscription.planPostQuota - subscription.post_used,
      reason: available ? null : 'Post quota exceeded'
    };
  }

  return { available: false, reason: 'Invalid quota type' };
}

// Thống kê doanh thu theo tháng
async function getRevenueByMonth(year) {
  const [rows] = await db.query(
    `SELECT 
      MONTH(s.start_at) AS month,
      COUNT(DISTINCT s.id) AS totalSubscriptions,
      SUM(p.price) AS totalRevenue
    FROM subscriptions s
    LEFT JOIN plans p ON s.plan_id = p.id
    WHERE YEAR(s.start_at) = ? 
      AND s.is_deleted = 0
      AND s.status IN ('active', 'expired')
    GROUP BY MONTH(s.start_at)
    ORDER BY month ASC`,
    [year]
  );
  
  // Tạo array 12 tháng với giá trị mặc định 0
  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    totalSubscriptions: 0,
    totalRevenue: 0
  }));
  
  // Fill data từ query
  rows.forEach(row => {
    monthlyData[row.month - 1] = {
      month: row.month,
      totalSubscriptions: row.totalSubscriptions,
      totalRevenue: parseFloat(row.totalRevenue || 0)
    };
  });
  
  return monthlyData;
}

module.exports = {
  findAllByCenter,
  findById,
  create,
  cancel,
  renew,
  deleteSubscription,
  updateStatus,
  deleteById,
  findActiveByCenterId,
  incrementLeadUsed,
  incrementPostUsed,
  checkAndUpdateExpired,
  checkAndCancelOverQuota,
  checkQuotaAvailable,
  getRevenueByMonth
};


