const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

async function findByGoogleId(googleId) {
  const [rows] = await db.query(
    "SELECT id, google_id AS googleId, email, name, avatar_url AS avatarUrl, role, email_verified AS emailVerified, created_at AS createdAt FROM users WHERE google_id = ? LIMIT 1",
    [googleId]
  );
  return rows[0] || null;
}

async function findByEmail(email) {
  const [rows] = await db.query(
    "SELECT id, google_id AS googleId, email, name, avatar_url AS avatarUrl, role,  email_verified AS emailVerified, created_at AS createdAt FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  return rows[0] || null;
}

async function createGoogleUser({ googleId, email, name, avatarUrl, role = 1, emailVerified = 1 }) {
  const id = uuidv4();
  await db.query(
    "INSERT INTO users (id, google_id, email, name, avatar_url, role, email_verified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())",
    [id, googleId, email, name, avatarUrl, role, emailVerified]
  );
  return id;
}

async function updateAvatar(userId, avatarUrl) {
  await db.query("UPDATE users SET avatar_url = ? WHERE id = ?", [avatarUrl, userId]);
}

async function findById(id) {
  const [rows] = await db.query(
    "SELECT id, google_id AS googleId, email, name, avatar_url AS avatarUrl, role, email_verified AS emailVerified, created_at AS createdAt FROM users WHERE id = ? LIMIT 1",
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
};


