const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
require("dotenv").config();
const User = require("../models/user.model");
const db = require("./db");

const serverOrigin = process.env.SERVER_ORIGIN || "https://studyportal.up.railway.app";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GG_CLIENT_ID,
      clientSecret: process.env.GG_CLIENT_SECRET,
      callbackURL: new URL("/api/v1/auth/google/callback", serverOrigin).toString(),
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const name = profile.displayName;
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        const avatarUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

        // 1) Try by googleId
        let user = await User.findByGoogleId(googleId);

        // 2) If not found, try by email to handle existing accounts
        if (!user && email) {
          const existingByEmail = await User.findByEmail(email);
          if (existingByEmail) {
            // If existing user doesn't have google_id, link the accounts
            if (!existingByEmail.googleId) {
              await db.query(
                "UPDATE users SET google_id = ?, avatar_url = ? WHERE email = ? AND is_deleted = 0",
                [googleId, avatarUrl, email]
              );
              user = { ...existingByEmail, googleId, avatarUrl };
            } else {
              // Email already exists with different google_id
              return done(null, false, { message: "Email is already registered by another Google account" });
            }
          }
        }

        // 3) Create new user if not exists
        if (!user) {
          try {
            const newId = await User.createGoogleUser({ googleId, email, name, avatarUrl });
            user = { id: newId, googleId, email, name, phone: null, avatarUrl };
          } catch (error) {
            // Handle race condition - user might have been created by another request
            if (error.code === 'ER_DUP_ENTRY' && error.message.includes('users.email')) {
              const existingUser = await User.findByEmail(email);
              if (existingUser) {
                user = existingUser;
              } else {
                return done(error, null);
              }
            } else {
              return done(error, null);
            }
          }
        } else if (avatarUrl && user.avatarUrl !== avatarUrl) {
          // 4) Update avatar if changed
          await User.updateAvatar(user.id, avatarUrl);
          user.avatarUrl = avatarUrl;
        }

        // Block deleted users just in case a stale record slipped through
        if (user && user.isDeleted) {
          return done(null, false, { message: "Tài khoản đã bị khóa/xóa" });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);


passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (e) {
    done(e, null);
  }
});

module.exports = passport;
