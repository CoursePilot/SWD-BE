const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");

async function findByGoogleId(googleId) {
  const [rows] = await db.query(
    "SELECT id, google_id AS googleId, email, name, phone, avatar_url AS avatarUrl, role, email_verified AS emailVerified, is_deleted AS isDeleted, created_at AS createdAt FROM users WHERE google_id = ? AND is_deleted = 0 LIMIT 1",
    [googleId]
  );
  return rows[0] || null;
}

async function findByEmail(email) {
  const [rows] = await db.query(
    "SELECT id, google_id AS googleId, email, name, phone, avatar_url AS avatarUrl, role,  email_verified AS emailVerified, is_deleted AS isDeleted, created_at AS createdAt FROM users WHERE email = ? AND is_deleted = 0 LIMIT 1",
    [email]
  );
  return rows[0] || null;
}

async function createGoogleUser({ googleId, email, name, avatarUrl, phone = null, role = 1, emailVerified = 1 }) {
  const id = uuidv4();
  
  try {
    await db.query(
      "INSERT INTO users (id, google_id, email, name, phone, avatar_url, role, email_verified, is_deleted, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, UTC_TIMESTAMP())",
      [id, googleId, email, name, phone, avatarUrl, role, emailVerified]
    );
    return id;
  } catch (error) {
    // Handle duplicate email error
    if (error.code === 'ER_DUP_ENTRY' && error.message.includes('users.email')) {
      // Email already exists, try to find the existing user
      const existingUser = await findByEmail(email);
      if (existingUser) {
        // If existing user doesn't have google_id, update it
        if (!existingUser.googleId) {
          await db.query(
            "UPDATE users SET google_id = ?, avatar_url = ? WHERE email = ? AND is_deleted = 0",
            [googleId, avatarUrl, email]
          );
        }
        return existingUser.id;
      }
    }
    throw error; // Re-throw other errors
  }
}

async function updateAvatar(userId, avatarUrl) {
  await db.query("UPDATE users SET avatar_url = ? WHERE id = ?", [avatarUrl, userId]);
}

async function findById(id) {
  const [rows] = await db.query(
    "SELECT id, google_id AS googleId, email, name, phone, avatar_url AS avatarUrl, role, email_verified AS emailVerified, is_deleted AS isDeleted, created_at AS createdAt FROM users WHERE id = ? AND is_deleted = 0 LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  findByGoogleId,
  findByEmail,
  createGoogleUser,
  updateAvatar,
  findById,
  createLocalUser,
  comparePassword,
  setEmailVerification,
  verifyByToken,
  setOtp,
  verifyOtp,
  updateProfile,
  updateRole,
  findAll,
  updateUser,
  deleteUser,
  createUser,
  emailExists,
  countStudents,
  getUserRegistrationByMonth
};

// Local auth: create user with email/password and profile
async function createLocalUser({ email, password, name, phone = null, avatarUrl = null, role = 1 }) {
  const id = uuidv4();
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(password, salt);
  await db.query(
    "INSERT INTO users (id, email, password_hash, name, phone, avatar_url, role, email_verified, is_deleted, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, UTC_TIMESTAMP())",
    [id, email, hashed, name, phone, avatarUrl, role]
  );
  return id;
}

async function comparePassword(plain, hashed) {
  return bcrypt.compare(plain, hashed);
}

async function setEmailVerification(userId, token, expiresAt) {
  await db.query(
    "UPDATE users SET verification_token = ?, verification_expires_at = ? WHERE id = ?",
    [token, expiresAt, userId]
  );
}

async function verifyByToken(token) {
  const [rows] = await db.query(
    "SELECT id, verification_expires_at FROM users WHERE verification_token = ? AND is_deleted = 0 LIMIT 1",
    [token]
  );
  const user = rows[0];
  if (!user) return null;
  if (user.verification_expires_at && new Date(user.verification_expires_at) < new Date()) {
    return null;
  }
  await db.query(
    "UPDATE users SET email_verified = 1, verification_token = NULL, verification_expires_at = NULL WHERE id = ?",
    [user.id]
  );
  return user.id;
}

async function setOtp(email, code, expiresAt) {
  await db.query(
    "UPDATE users SET email_otp_code = ?, email_otp_expires_at = ? WHERE email = ?",
    [code, expiresAt, email]
  );
}

async function verifyOtp(email, code) {
  const [rows] = await db.query(
    "SELECT id, email_otp_code, email_otp_expires_at FROM users WHERE email = ? AND is_deleted = 0 LIMIT 1",
    [email]
  );
  const user = rows[0];
  if (!user) return null;
  if (!user.email_otp_code || user.email_otp_code !== code) return null;
  if (user.email_otp_expires_at && new Date(user.email_otp_expires_at) < new Date()) return null;
  await db.query(
    "UPDATE users SET email_verified = 1, email_otp_code = NULL, email_otp_expires_at = NULL WHERE id = ?",
    [user.id]
  );
  return user.id;
}

async function updateProfile(userId, { name, phone, avatarUrl }) {
  const updateFields = [];
  const updateValues = [];

  if (name !== undefined) {
    updateFields.push("name = ?");
    updateValues.push(name);
  }
  
  if (phone !== undefined) {
    updateFields.push("phone = ?");
    updateValues.push(phone);
  }
  
  if (avatarUrl !== undefined) {
    updateFields.push("avatar_url = ?");
    updateValues.push(avatarUrl);
  }

  if (updateFields.length === 0) {
    return; // Nothing to update
  }

  updateValues.push(userId);
  
  await db.query(
    `UPDATE users SET ${updateFields.join(", ")} WHERE id = ? AND is_deleted = 0`,
    updateValues
  );
}

// Cập nhật role của user
async function updateRole(userId, role) {
  await db.query(
    "UPDATE users SET role = ? WHERE id = ? AND is_deleted = 0",
    [role, userId]
  );
}

// Lấy tất cả users với phân trang và lọc
async function findAll({ page = 1, limit = 10, role = null, emailVerified = null, search = null }) {
  const offset = (page - 1) * limit;
  let whereClause = "is_deleted = 0";
  let params = [];

  if (role !== null) {
    whereClause += " AND role = ?";
    params.push(role);
  }

  if (emailVerified !== null) {
    whereClause += " AND email_verified = ?";
    params.push(emailVerified);
  }

  if (search) {
    whereClause += " AND (name LIKE ? OR email LIKE ?)";
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern);
  }

  params.push(limit, offset);

  const [rows] = await db.query(
    `SELECT 
      id, 
      google_id AS googleId, 
      email, 
      name, 
      phone, 
      avatar_url AS avatarUrl, 
      role, 
      email_verified AS emailVerified, 
      is_deleted AS isDeleted, 
      created_at AS createdAt 
    FROM users 
    WHERE ${whereClause}
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?`,
    params
  );

  // Đếm tổng số records
  const countParams = params.slice(0, -2); // Remove limit and offset
  const [countRows] = await db.query(
    `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`,
    countParams
  );

  return {
    users: rows,
    total: countRows[0].total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(countRows[0].total / limit)
  };
}

// Cập nhật thông tin user (admin)
async function updateUser(id, updates) {
  const updateFields = [];
  const updateValues = [];

  if (updates.name !== undefined) {
    updateFields.push("name = ?");
    updateValues.push(updates.name);
  }
  
  if (updates.email !== undefined) {
    updateFields.push("email = ?");
    updateValues.push(updates.email);
  }
  
  if (updates.phone !== undefined) {
    updateFields.push("phone = ?");
    updateValues.push(updates.phone);
  }
  
  if (updates.avatarUrl !== undefined) {
    updateFields.push("avatar_url = ?");
    updateValues.push(updates.avatarUrl);
  }
  
  if (updates.role !== undefined) {
    updateFields.push("role = ?");
    updateValues.push(updates.role);
  }
  
  if (updates.emailVerified !== undefined) {
    updateFields.push("email_verified = ?");
    updateValues.push(updates.emailVerified);
  }

  if (updateFields.length === 0) {
    return; // Nothing to update
  }

  updateValues.push(id);
  
  await db.query(
    `UPDATE users SET ${updateFields.join(", ")} WHERE id = ? AND is_deleted = 0`,
    updateValues
  );
}

// Xóa user (soft delete)
async function deleteUser(id) {
  await db.query(
    "UPDATE users SET is_deleted = 1 WHERE id = ?",
    [id]
  );
}

// Tạo user mới (admin)
async function createUser({ email, password, name, phone = null, avatarUrl = null, role = 1, emailVerified = 0 }) {
  const id = uuidv4();
  let hashedPassword = null;
  
  if (password) {
    const salt = await bcrypt.genSalt(10);
    hashedPassword = await bcrypt.hash(password, salt);
  }

  await db.query(
    "INSERT INTO users (id, email, password_hash, name, phone, avatar_url, role, email_verified, is_deleted, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, UTC_TIMESTAMP())",
    [id, email, hashedPassword, name, phone, avatarUrl, role, emailVerified]
  );
  return id;
}

// Kiểm tra email đã tồn tại chưa
async function emailExists(email, excludeId = null) {
  let whereClause = "email = ? AND is_deleted = 0";
  let params = [email];
  
  if (excludeId) {
    whereClause += " AND id != ?";
    params.push(excludeId);
  }

  const [rows] = await db.query(
    `SELECT id FROM users WHERE ${whereClause} LIMIT 1`,
    params
  );
  return rows.length > 0;
}

// Đếm số lượng users (trừ users đã có center - role = 2)
async function countStudents() {
  const [rows] = await db.query(
    `SELECT COUNT(*) as total 
     FROM users 
     WHERE role = 1 AND is_deleted = 0`
  );
  return rows[0].total;
}

// Thống kê số lượng user đăng ký theo tháng
async function getUserRegistrationByMonth(year) {
  const [rows] = await db.query(
    `SELECT 
      MONTH(created_at) AS month,
      COUNT(*) AS totalUsers
    FROM users
    WHERE YEAR(created_at) = ? AND is_deleted = 0
    GROUP BY MONTH(created_at)
    ORDER BY month ASC`,
    [year]
  );
  
  // Tạo array 12 tháng với giá trị mặc định 0
  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    totalUsers: 0
  }));
  
  // Fill data từ query
  rows.forEach(row => {
    monthlyData[row.month - 1] = {
      month: row.month,
      totalUsers: row.totalUsers
    };
  });
  
  return monthlyData;
}


