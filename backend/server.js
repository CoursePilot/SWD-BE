const express = require("express");
const http = require("http");
const setupSwagger = require("./config/swagger.js");
const passport = require("./config/passport.js");
const session = require("express-session");
const socketManager = require("./utils/socketManager");
require('dotenv').config({ debug: false });

const cors = require("cors");

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: "*",
  credentials: true,
}));



app.use(express.json());

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());

// Setup Swagger
setupSwagger(app);

// Mount API routes
app.use("/api/v1/auth", require("./routes/auth.route"));
app.use("/api/v1/centers", require("./routes/center.route"));
app.use("/api/v1/users", require("./routes/user.route"));
app.use("/api/v1/plans", require("./routes/plan.route"));
app.use("/api/v1/subscriptions", require("./routes/subscription.route"));
app.use("/api/v1/courses", require("./routes/course.route"));
app.use("/api/v1/categories", require("./routes/category.route"));
app.use("/api/v1/schedules", require("./routes/schedule.route"));
app.use("/api/v1/follows", require("./routes/follow.route"));
app.use("/api/v1/payments", require("./routes/payment.route"));
app.use("/api/v1/leads", require("./routes/lead.route"));
app.use("/api/v1/notifications", require("./routes/notification.route"));
app.use("/api/v1/chat", require("./routes/chat.route"));
app.use("/api/v1/knowledge", require("./routes/knowledge.route"));
app.use("/api/v1/statistics", require("./routes/statistics.route"));

// Root route for convenience
app.get("/", (req, res) => {
  return res.redirect("/docs");
});


// Initialize subscription cron jobs
const subscriptionCron = require("./services/subscriptionCron");
subscriptionCron.setupCronJobs();

const PORT = process.env.PORT || 3000;

// Initialize Socket.io
socketManager.initialize(server);

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📘 Swagger docs: http://localhost:${PORT}/docs`);
  console.log(`🔌 Socket.io ready for real-time notifications`);
});
