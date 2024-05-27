const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { check, validationResult } = require("express-validator");
const { pool } = require("../database");
const verifyToken = require("../middleware/authMiddleware");

const router = express.Router();

const jwtSecret = process.env.JWT_SECRET || "jwt_secret";

router.post(
  "/register",
  [
    check("username", "Username is required").not().isEmpty(),
    check("password", "Password must be at least 6 characters long").isLength({
      min: 6,
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { username, password } = req.body;

    try {
      // Check if user exists
      const [user] = await pool.query(
        "SELECT * FROM users WHERE username = ?",
        [username]
      );
      if (user.length > 0) {
        return res.status(400).json({ msg: "User already exists" });
      }
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Insert user into the database
      await pool.query("INSERT INTO users (username, password) VALUES (?, ?)", [
        username,
        hashedPassword,
      ]);

      const payload = { username };
      const token = jwt.sign(payload, jwtSecret, { expiresIn: "1h" });

      res.status(201).json({ token });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ msg: "Server error" });
    }
  }
);

// User Login Route
router.post(
  "/login",
  [
    check("username", "Username is required").not().isEmpty(),
    check("password", "Password is required").exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { username, password } = req.body;

    try {
      // Check if user exists
      const [user] = await pool.query(
        "SELECT * FROM users WHERE username = ?",
        [username]
      );

      if (user.length === 0) {
        return res.status(400).json({ msg: "Invalid credentials" });
      }

      const isMatch = await bcrypt.compare(password, user[0].password);
      if (!isMatch) {
        return res.status(400).json({ msg: "Invalid credentials" });
      }

      const payload = { username };
      const token = jwt.sign(payload, jwtSecret, { expiresIn: "1h" });

      res.status(200).json({ token });
    } catch (error) {
      console.error("Error logging in user:", error);
      res.status(500).json({ msg: "Server error" });
    }
  }
);

router.post("/verifyToken", verifyToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
