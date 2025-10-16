const express = require("express");
const router = express.Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");
const { register, login, requestEmailOtp, verifyEmailOtp, getUserById, updateProfile, getProfile, googleMobileLogin } = require("../controllers/auth.controller");
const { loginValidation, registerValidation, requestOtpValidation, verifyOtpValidation, updateProfileValidation } = require("../middlewares/auth.validator");
const { auth, requireEmailVerified, isAdmin, isEmployee, isAdminOrEmployee } = require("../middlewares/auth.middleware");
const { upload, handleMulterError } = require("../middlewares/upload.middleware");
require("dotenv").config();

/**
 * @swagger
 * /api/v1/auth/google:
 *   get:
 *     summary: Đăng nhập bằng Google
 *     description: Redirect người dùng đến trang đăng nhập Google. Không thể test trực tiếp trên Swagger UI.
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect đến Google OAuth
 */
router.get("/google", passport.authenticate("google", { 
  scope: ["profile", "email"] 
}));

/**
 * @swagger
 * /api/v1/auth/google-mobile:
 *   post:
 *     summary: Đăng nhập Google cho Android App
 *     description: Android app gửi Google ID token để đăng nhập (không dùng redirect)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Google ID token từ Android app
 *             required:
 *               - idToken
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     googleId:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     avatarUrl:
 *                       type: string
 *                     role:
 *                       type: integer
 *                     emailVerified:
 *                       type: boolean
 *       400:
 *         description: Missing or invalid Google ID token
 *       401:
 *         description: Invalid Google ID token or account locked
 */
router.post("/google-mobile", googleMobileLogin);

/**
 * @swagger
 * /api/v1/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     description: Google sẽ redirect về đây sau khi user đăng nhập. Không thể test trực tiếp trên Swagger UI.
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code từ Google
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     googleId:
 *                       type: string
 *                     displayName:
 *                       type: string
 *                     email:
 *                       type: string
 *                     avatarUrl:
 *                       type: string
 *       401:
 *         description: Đăng nhập thất bại
 */
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL.replace(/\/$/, "")}/login?error=google_login_failed`
      : "/",
  }),
  (req, res) => {
    if (!req.user) {
      const failUrl = process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL.replace(/\/$/, "")}/login?error=authentication_failed`
        : "/";
      return res.redirect(failUrl);
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: "Missing JWT_SECRET" });
    }

    // Sign JWT (adjust payload keys to match your user shape)
    const token = jwt.sign(
      {
        id: req.user.id,
        googleId: req.user.googleId,
        email: req.user.email,
        name: req.user.name || req.user.displayName,
        phone: req.user.phone || null,
      },
      jwtSecret,
      { expiresIn: "1d" }
    );

    // Encode minimal user info for frontend
    const userString = encodeURIComponent(
      JSON.stringify({
        id: req.user.id,
        googleId: req.user.googleId,
        email: req.user.email,
        name: req.user.name || req.user.displayName,
        avatarUrl: req.user.avatarUrl,
        phone: req.user.phone || null,
        role: req.user.role || null,
      })
    );

    const explicitCallback = process.env.FRONTEND_CALLBACK_URL; // full URL
    const frontendUrl = process.env.FRONTEND_URL; // origin only

    if (!explicitCallback && !frontendUrl) {
      return res.status(200).json({
        message: "Google login successful",
        token,
        user: JSON.parse(decodeURIComponent(userString)),
      });
    }

    const callbackUrl = explicitCallback
      ? explicitCallback
      : `${frontendUrl.replace(/\/$/, "")}/auth/google/callback`;

    return res.redirect(`${callbackUrl}?token=${token}&user=${userString}`);
  }
);

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Đăng ký tài khoản
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 */
router.post("/register", registerValidation, register);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Đăng nhập bằng email/password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 */
router.post("/login", loginValidation, login);
/**
 * @swagger
 * /api/v1/auth/request-email-otp:
 *   post:
 *     summary: Gửi lại mã OTP xác minh email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 */
router.post("/request-email-otp", requestOtpValidation, requestEmailOtp);

/**
 * @swagger
 * /api/v1/auth/verify-email-otp:
 *   post:
 *     summary: Xác minh email bằng mã OTP 6 số
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 */
router.post("/verify-email-otp", verifyOtpValidation, verifyEmailOtp);

/**
 * @swagger
 * /api/v1/auth/user/{id}:
 *   get:
 *     summary: Lấy thông tin user theo ID
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Lấy thông tin user thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     avatarUrl:
 *                       type: string
 *                     role:
 *                       type: integer
 *                     emailVerified:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *       404:
 *         description: User not found
 */
router.get("/user/:id", getUserById);

/**
 * @swagger
 * /api/v1/auth/profile:
 *   put:
 *     summary: Cập nhật profile user (with avatar upload)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tên user
 *               phone:
 *                 type: string
 *                 description: Số điện thoại
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Avatar image file (optional)
 *     responses:
 *       200:
 *         description: Cập nhật profile thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     avatarUrl:
 *                       type: string
 *                     role:
 *                       type: integer
 *                     emailVerified:
 *                       type: boolean
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.put("/profile", auth, requireEmailVerified, upload.fields([{ name: "avatar", maxCount: 1 }]), handleMulterError, updateProfileValidation, updateProfile);


/**
 * @swagger
 * /api/v1/auth/profile:
 *   get:
 *     summary: Lấy thông tin profile của user hiện tại
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin profile user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     avatarUrl:
 *                       type: string
 *                     role:
 *                       type: integer
 *                     emailVerified:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *       401:
 *         description: Token không hợp lệ hoặc không được cung cấp
 *       404:
 *         description: User không tìm thấy
 */
router.get("/profile", auth, getProfile);

module.exports = router;