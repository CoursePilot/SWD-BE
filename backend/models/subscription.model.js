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
      s.created_at AS createdAt,
      s.updated_at AS updatedAt,
      p.name AS planName,
      p.price AS planPrice,
      p.duration_days AS planDurationDays,
      p.lead_quota AS planLeadQuota,
      p.post_quota AS planPostQuota
    FROM subscriptions s
    LEFT JOIN plans p ON p.id = s.plan_id
    WHERE ${whereClause}
    ORDER BY s.created_at DESC
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
      s.created_at AS createdAt,
      s.updated_at AS updatedAt,
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

async function create({ centerId, planId, startAt, endAt, autoRenew = 0 }) {
  const id = uuidv4();
  await db.query(
    `INSERT INTO subscriptions (
      id, center_id, plan_id, start_at, end_at, lead_used, post_used, status, is_deleted, auto_renew, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 0, 0, 'active', 0, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [id, centerId, planId, startAt, endAt, autoRenew]
  );
  return id;
}

async function cancel(id, reason) {
  await db.query(
    `UPDATE subscriptions 
     SET status = 'cancelled', reason_cancel = ?, cancelled_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP()
     WHERE id = ? AND is_deleted = 0`,
    [reason || null, id]
  );
}

async function renew(id, { startAt, endAt }) {
  await db.query(
    `UPDATE subscriptions 
     SET start_at = ?, end_at = ?, status = 'active', lead_used = 0, post_used = 0, cancelled_at = NULL, reason_cancel = NULL, updated_at = UTC_TIMESTAMP()
     WHERE id = ? AND is_deleted = 0`,
    [startAt, endAt, id]
  );
}

async function deleteSubscription(id) {
  await db.query(
    `UPDATE subscriptions SET is_deleted = 1, updated_at = UTC_TIMESTAMP() WHERE id = ?`,
    [id]
  );
}

module.exports = {
  findAllByCenter,
  findById,
  create,
  cancel,
  renew,
  deleteSubscription,
};


