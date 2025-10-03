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
  await db.query(
    "INSERT INTO users (id, google_id, email, name, phone, avatar_url, role, email_verified, is_deleted, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, UTC_TIMESTAMP())",
    [id, googleId, email, name, phone, avatarUrl, role, emailVerified]
  );
  return id;
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


