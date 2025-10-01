const express = require("express");
const setupSwagger = require("./config/swagger.js");
const passport = require("./config/passport.js");
const session = require("express-session");
require('dotenv').config();
const cors = require("cors");

const app = express();
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

// Root route for convenience
app.get("/", (req, res) => {
  return res.redirect("/api-docs");
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

});
