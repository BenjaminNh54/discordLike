const express = require("express");  
const bcrypt = require("bcryptjs");  
const jwt = require("jsonwebtoken");  
const { dbGet, dbRun } = require("../db");  
const { JWT_SECRET } = require("../middleware/auth");  
  
const router = express.Router();  
  
router.post("/register", async (req, res) => {  
  try {  
    const { username, password } = req.body;  
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });  
    if (username.length < 3) return res.status(400).json({ error: "Username must be at least 3 characters" });  
    if (password.length < 4) return res.status(400).json({ error: "Password must be at least 4 characters" });  
  
    const existing = await dbGet("SELECT id FROM users WHERE username = ?", [username]);  
    if (existing) return res.status(409).json({ error: "Username already taken" });  
  
    const hashed = bcrypt.hashSync(password, 10);  
    const result = await dbRun("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashed]);  
  
    const token = jwt.sign({ userId: result.lastInsertRowid, username }, JWT_SECRET, { expiresIn: "7d" });  
    res.json({ token, user: { id: result.lastInsertRowid, username } });  
  } catch (err) {  
    console.error("register error:", err);  
    res.status(500).json({ error: "Internal server error" });  
  }  
});  
  
router.post("/login", async (req, res) => {  
  try {  
    const { username, password } = req.body;  
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });  
  
    const user = await dbGet("SELECT * FROM users WHERE username = ?", [username]);  
    if (!user) return res.status(401).json({ error: "Invalid credentials" });  
    if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: "Invalid credentials" });  
  
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });  
    res.json({ token, user: { id: user.id, username: user.username } });  
  } catch (err) {  
    console.error("login error:", err);  
    res.status(500).json({ error: "Internal server error" });  
  }  
});  
  
router.get("/me", async (req, res) => {  
  const authHeader = req.headers["authorization"];  
  const token = authHeader && authHeader.split(" ")[1];  
  if (!token) return res.status(401).json({ error: "No token" });  
  
  try {  
    const decoded = jwt.verify(token, JWT_SECRET);  
    const user = await dbGet("SELECT id, username, avatar, created_at FROM users WHERE id = ?", [decoded.userId]);  
    if (!user) return res.status(404).json({ error: "User not found" });  
    res.json({ user });  
  } catch (err) {  
    res.status(403).json({ error: "Invalid token" });  
  }  
});  
  
router.post("/auto-login", async (req, res) => {  
  try {  
    const { username } = req.body;  
    if (!username || username.length < 3) return res.status(400).json({ error: "Invalid username" });  
  
    let user = await dbGet("SELECT id, username FROM users WHERE username = ?", [username]);  
  
    if (!user) {  
      const crypto = require("crypto");  
      const randomPassword = crypto.randomUUID();  
      const hashed = bcrypt.hashSync(randomPassword, 10);  
      const result = await dbRun("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashed]);  
      user = { id: result.lastInsertRowid, username };  
    }  
  
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });  
    res.json({ token, user: { id: user.id, username: user.username } });  
  } catch (err) {  
    console.error("auto-login error:", err);  
    res.status(500).json({ error: "Internal server error" });  
  }  
});  
  
module.exports = router;
