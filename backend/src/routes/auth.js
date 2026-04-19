const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

function buildToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    process.env.JWT_SECRET || "change_this_secret",
    { expiresIn: "7d" }
  );
}

router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "Name, email, password, and role are required." });
  }

  if (!["manager", "employee"].includes(role)) {
    return res.status(400).json({ message: "Role must be manager or employee." });
  }

  try {
    const [existingUsers] = await pool.execute(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [name, email, passwordHash, role]
    );

    const user = {
      id: result.insertId,
      name,
      email,
      role
    };

    const token = buildToken(user);

    return res.status(201).json({
      message: "Registration successful.",
      token,
      user
    });
  } catch (error) {
    console.error("Register error:", error.message);
    return res.status(500).json({
      message: "Unable to register user. Check backend environment and MySQL connection."
    });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    const [rows] = await pool.execute(
      "SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    const token = buildToken(safeUser);

    return res.json({
      message: "Login successful.",
      token,
      user: safeUser
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({
      message: "Unable to log in. Check backend environment and MySQL connection."
    });
  }
});

router.get("/me", authenticate, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, name, email, role, created_at FROM users WHERE id = ? LIMIT 1",
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({ user: rows[0] });
  } catch (error) {
    console.error("Current user error:", error.message);
    return res.status(500).json({ message: "Unable to fetch current user." });
  }
});

router.put("/me", authenticate, async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: "Name and email are required." });
  }

  try {
    const [existingUsers] = await pool.execute(
      "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
      [email, req.user.id]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ message: "This email is already in use by another account." });
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      await pool.execute(
        "UPDATE users SET name = ?, email = ?, password_hash = ? WHERE id = ?",
        [name, email, passwordHash, req.user.id]
      );
    } else {
      await pool.execute(
        "UPDATE users SET name = ?, email = ? WHERE id = ?",
        [name, email, req.user.id]
      );
    }

    const [rows] = await pool.execute(
      "SELECT id, name, email, role, created_at FROM users WHERE id = ? LIMIT 1",
      [req.user.id]
    );

    const updatedUser = rows[0];
    const token = buildToken(updatedUser);

    return res.json({
      message: "Profile updated successfully.",
      token,
      user: updatedUser
    });
  } catch (error) {
    console.error("Update profile error:", error.message);
    return res.status(500).json({ message: "Unable to update profile." });
  }
});

module.exports = router;
