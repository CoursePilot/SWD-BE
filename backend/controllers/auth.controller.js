const passport = require("passport");

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
};