const express = require("express");
const router = express.Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");
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

module.exports = router;