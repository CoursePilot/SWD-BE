// ==========================================
// FILE: server.js
// ==========================================
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("./config/passport.js");
const setupSwagger = require("./config/swagger.js");
require('dotenv').config({ debug: false });

// Core Routes
const authRoutes = require("./routes/auth.route");
const centerRoutes = require("./routes/center.route");
const userRoutes = require("./routes/user.route");
const planRoutes = require("./routes/plan.route");
const subscriptionRoutes = require("./routes/subscription.route");

// 🧩 Chatbot RAG Routes (bổ sung)
const chatRoutes = require("./routes/chat.route");
const knowledgeRoutes = require("./routes/knowledge.route");

// Additional Routes
const courseRoutes = require("./routes/course.route");
const categoryRoutes = require("./routes/category.route");
const scheduleRoutes = require("./routes/schedule.route");
const followRoutes = require("./routes/follow.route");

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 🧩 Middleware
// ==========================================
app.use(cors({
  origin: "*",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Setup Swagger
setupSwagger(app);

// ✅ Logging middleware (thêm)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.originalUrl}`);
  next();
});

// ==========================================
// 🧠 Mount API Routes
// ==========================================
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/centers", centerRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/plans", planRoutes);
app.use("/api/v1/subscriptions", subscriptionRoutes);

// 🧩 Bổ sung Chatbot RAG routes
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/knowledge", knowledgeRoutes);

// Additional API routes
app.use("/api/v1/courses", courseRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/schedules", scheduleRoutes);
app.use("/api/v1/follows", followRoutes);

// ==========================================
// ✅ Health Check (thêm)
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Unified API (Core + Chatbot RAG)",
    timestamp: new Date().toISOString(),
    database: "MySQL + Supabase Vector",
    ai_service: "Google Gemini",
    gemini: process.env.GEMINI_API_KEY ? "✅ Configured" : "❌ Missing",
  });
});

// Root route
app.get("/", (req, res) => {
  return res.redirect("/api-docs");
});

// ==========================================
// ⚠️ 404 & Error Handling (thêm)
// ==========================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint không tồn tại",
  });
});

app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.stack);
  res.status(500).json({
    success: false,
    error: "Có lỗi xảy ra trên server",
  });
});

// ==========================================
// 🚀 Start Server
// ==========================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📘 Swagger docs: http://localhost:${PORT}/api-docs`);
});
