const pool = require("../config/db.js"); 

async function testConnection() {
  try {
    const [rows] = await pool.query("SELECT NOW() AS currentTime");
    console.log("✅ Database connected! Current time:", rows[0].currentTime);
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  }
}

testConnection();
