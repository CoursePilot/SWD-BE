const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const auth = async (req, res, next) => {
  try {
    // Lấy token từ header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Please authenticate.",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Kiểm tra user có tồn tại không
    const user = await User.findById(decoded.id || decoded.userId);
    if (!user || user.isDeleted) {
      return res.status(401).json({ 
        error: "Account is locked or deleted. Please login again." 
      });
    }

    // Thêm thông tin user vào request
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        error: "Invalid token",
      });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token expired",
      });
    }
    return res.status(401).json({
      error: "Please authenticate.",
    });
  }
};

const requireEmailVerified = (req, res, next) => {
  if (!req.user.emailVerified) {
    return res.status(403).json({ error: 'Email verification required' });
  }
  next();
};

// Role-based access control
const isAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 3 || req.user.role === "admin")) {
    return next();
  }
  return res.status(403).json({ error: "Access denied. Admins only." });
};

const isEmployee = (req, res, next) => {
  if (req.user && (req.user.role === 2 || req.user.role === "employee")) {
    return next();
  }
  return res.status(403).json({ error: "Access denied. Employees only." });
};

const isAdminOrEmployee = (req, res, next) => {
  if (req.user && (req.user.role === 2 || req.user.role === 3)) {
    return next();
  }
  return res.status(403).json({ error: "Forbidden: Admin or Employee only" });
};

module.exports = {
  auth,
  verifyToken: auth, // Alias for backward compatibility
  requireEmailVerified,
  isAdmin,
  isEmployee,
  isAdminOrEmployee,
};
