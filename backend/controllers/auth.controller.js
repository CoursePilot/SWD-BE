const passport = require("passport");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { sendVerificationEmail, sendEmailOtp } = require("../services/emailService");
const { v4: uuidv4 } = require("uuid");

const googleLogin = passport.authenticate("google", { 
  scope: ["profile", "email"] 
});

const googleCallback = [
  passport.authenticate("google", { 
    failureRedirect: "/login",
    session: true 
  }),
  (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Đăng nhập thất bại" });
    }
    res.status(200).json({
      message: "Đăng nhập thành công",
      user: req.user,
    });
  }
];



module.exports = {
  googleLogin,
  googleCallback,
  register,
  login,
  requestEmailOtp,
  verifyEmailOtp,
  getUserById,
  updateProfile,
  verifyToken,
  getProfile,
};

// Register new local user
async function register(req, res) {
  try {
    const { email, password, name, phone } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    const newId = await User.createLocalUser({ email, password, name, phone });

    // generate 6-digit OTP and send email (expires in 10 minutes)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 10);
    await User.setOtp(email, code, expiresAt);
    try { await sendEmailOtp(email, code); } catch (e) { /* ignore send error */ }

    const created = await User.findById(newId);
    return res.status(201).json({
      message: "Đăng ký thành công. Vui lòng kiểm tra email để xác minh.",
      user: {
        id: created.id,
        email: created.email,
        name: created.name,
        phone: created.phone || null,
        avatarUrl: created.avatarUrl || null,
        role: created.role,
        emailVerified: created.emailVerified,
      }
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Login local user
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // fetch including password hash
    const [rows] = await require("../config/db").query(
      "SELECT id, email, name, phone, avatar_url AS avatarUrl, role, email_verified AS emailVerified, is_deleted AS isDeleted, password_hash AS passwordHash FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    if (user.isDeleted) {
      return res.status(401).json({ error: "Account is locked" });
    }

    const ok = await User.comparePassword(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ error: "Email chưa được xác minh" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone || null,
        avatarUrl: user.avatarUrl || null,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}


// Request email OTP for verification
async function requestEmailOtp(req, res) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Check if user exists
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return res.status(400).json({ error: "Email is already verified" });
    }

    // Generate 6-digit OTP and send email (expires in 10 minutes)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 10);
    await User.setOtp(email, code, expiresAt);
    
    try { 
      await sendEmailOtp(email, code); 
    } catch (e) { 
      console.error("Failed to send OTP email:", e);
      // Continue anyway, don't fail the request
    }

    return res.status(200).json({
      message: "Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra email."
    });
  } catch (err) {
    console.error("Request email OTP error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Verify email using OTP code
async function verifyEmailOtp(req, res) {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ error: "Email and OTP code are required" });
    }

    // Verify the OTP code
    const userId = await User.verifyOtp(email, code);
    if (!userId) {
      return res.status(400).json({ error: "Invalid or expired OTP code" });
    }

    return res.status(200).json({
      message: "Email đã được xác minh thành công"
    });
  } catch (err) {
    console.error("Verify email OTP error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Get user by ID
async function getUserById(req, res) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.isDeleted) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return user without sensitive information
    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone || null,
        avatarUrl: user.avatarUrl || null,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      }
    });
  } catch (err) {
    console.error("Get user by ID error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Update user profile (with file upload like ProjectOJT)
async function updateProfile(req, res) {
  try {
    const userId = req.user.id; // From auth middleware
    const updates = req.body;

    // Remove avatar from body updates (we'll handle file separately)
    delete updates.avatar;

    // Get existing user to check current avatar
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (existingUser.isDeleted) {
      return res.status(404).json({ error: "User not found" });
    }

    // Handle avatar upload if file is provided
    if (req.files && req.files.avatar && req.files.avatar[0]) {
      try {
        const supabase = require('../config/supabase');
        
        // Delete old avatar if exists
        if (existingUser.avatarUrl) {
          try {
            // Extract file path from Supabase URL
            const urlParts = existingUser.avatarUrl.split('/');
            const fileName = urlParts[urlParts.length - 1];
            const filePath = `avatars/${userId}/${fileName}`;
            
            await supabase.storage
              .from('SWD_image')
              .remove([filePath]);
          } catch (deleteError) {
            console.log("Could not delete old avatar:", deleteError.message);
          }
        }

        // Upload new avatar
        const avatarFile = req.files.avatar[0];
        const fileExtension = avatarFile.originalname.split('.').pop();
        const fileName = `${Date.now()}-${avatarFile.originalname.replace(/\s+/g, "_")}`;
        const filePath = `avatars/${userId}/${fileName}`;

        const { data, error } = await supabase.storage
          .from('SWD_image')
          .upload(filePath, avatarFile.buffer, {
            contentType: avatarFile.mimetype,
            upsert: false
          });

        if (error) {
          console.error("Supabase upload error:", error);
          return res.status(500).json({
            error: "Failed to upload avatar"
          });
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('SWD_image')
          .getPublicUrl(filePath);

        updates.avatarUrl = urlData.publicUrl;

      } catch (uploadError) {
        console.error("Avatar upload failed:", uploadError);
        return res.status(500).json({
          error: "Avatar upload failed during profile update"
        });
      }
    }

    // Define allowed update fields
    const allowedUpdates = ["name", "phone", "avatarUrl"];

    // Filter out empty values but allow updates even if some fields are empty
    const filteredUpdates = {};
    Object.keys(updates).forEach((key) => {
      if (
        updates[key] !== undefined &&
        updates[key] !== null &&
        updates[key] !== ""
      ) {
        filteredUpdates[key] = updates[key];
      }
    });

    // Allow update even if no text fields are provided (avatar upload might be the only change)
    // Only check if both filteredUpdates and avatar upload are empty
    if (Object.keys(filteredUpdates).length === 0 && (!req.files || !req.files.avatar)) {
      return res.status(400).json({
        error: "No valid updates provided. Please provide at least one field to update or upload an avatar."
      });
    }

    // Check if all update fields are allowed
    const updatesKeys = Object.keys(filteredUpdates);
    const isValidOperation = updatesKeys.every((key) =>
      allowedUpdates.includes(key)
    );
    if (!isValidOperation) {
      return res.status(400).json({
        error: "Invalid update fields"
      });
    }

    // Update user profile
    await User.updateProfile(userId, filteredUpdates);

    // Get updated user data
    const updatedUser = await User.findById(userId);

    return res.status(200).json({
      message: "Cập nhật profile thành công",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        phone: updatedUser.phone || null,
        avatarUrl: updatedUser.avatarUrl || null,
        role: updatedUser.role,
        emailVerified: updatedUser.emailVerified,
      }
    });
  } catch (err) {
    console.error("Update profile error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Verify JWT token
async function verifyToken(req, res) {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ 
        error: "Invalid token - user not found",
        valid: false 
      });
    }

    if (user.isDeleted) {
      return res.status(401).json({ 
        error: "Invalid token - user account is disabled",
        valid: false 
      });
    }

    return res.status(200).json({
      message: "Token is valid",
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone || null,
        avatarUrl: user.avatarUrl || null,
        role: user.role,
        emailVerified: user.emailVerified,
      }
    });

  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: "Invalid token",
        valid: false 
      });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: "Token expired",
        valid: false 
      });
    }
    console.error("Verify token error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Get current user profile from token
async function getProfile(req, res) {
  try {
    const userId = req.user.id; // From auth middleware
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.isDeleted) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone || null,
        avatarUrl: user.avatarUrl || null,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      }
    });

  } catch (err) {
    console.error("Get profile error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}