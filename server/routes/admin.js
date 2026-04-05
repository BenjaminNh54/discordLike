const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");

const router = express.Router();

// Admin login
router.post("/login", (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password required" });

  const setting = db.prepare("SELECT * FROM admin_settings WHERE key = 'admin_password'").get();
  if (!setting) return res.status(500).json({ error: "Admin not configured" });

  if (!bcrypt.compareSync(password, setting.value)) {
    return res.status(401).json({ error: "Wrong password" });
  }

  res.json({ success: true });
});

// Change admin password
router.post("/change-password", (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const setting = db.prepare("SELECT * FROM admin_settings WHERE key = 'admin_password'").get();
  if (!bcrypt.compareSync(currentPassword, setting.value)) {
    return res.status(401).json({ error: "Current password is wrong" });
  }

  const hashed = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE admin_settings SET value = ? WHERE key = 'admin_password'").run(hashed);
  res.json({ message: "Password changed" });
});

// Get all users
router.get("/users", (req, res) => {
  const users = db.prepare("SELECT id, username, avatar, created_at FROM users ORDER BY created_at DESC").all();
  res.json({ users });
});

// Delete user
router.delete("/users/:id", (req, res) => {
  db.prepare("DELETE FROM group_members WHERE user_id = ?").run(req.params.id);
  db.prepare("DELETE FROM join_requests WHERE user_id = ?").run(req.params.id);
  db.prepare("DELETE FROM messages WHERE user_id = ?").run(req.params.id);
  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ message: "User deleted" });
});

// Get all groups
router.get("/groups", (req, res) => {
  const groups = db.prepare(`
    SELECT g.*,
      (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
      (SELECT username FROM users WHERE id = g.creator_id) as creator_name
    FROM groups_table g
    ORDER BY g.created_at DESC
  `).all();
  res.json({ groups });
});

// Delete group
router.delete("/groups/:id", (req, res) => {
  db.prepare("DELETE FROM messages WHERE group_id = ?").run(req.params.id);
  db.prepare("DELETE FROM group_members WHERE group_id = ?").run(req.params.id);
  db.prepare("DELETE FROM join_requests WHERE group_id = ?").run(req.params.id);
  db.prepare("DELETE FROM groups_table WHERE id = ?").run(req.params.id);
  res.json({ message: "Group deleted" });
});

// Get all messages
router.get("/messages", (req, res) => {
  const messages = db.prepare(`
    SELECT m.*, u.username, g.name as group_name
    FROM messages m
    JOIN users u ON m.user_id = u.id
    JOIN groups_table g ON m.group_id = g.id
    ORDER BY m.created_at DESC
    LIMIT 100
  `).all();
  res.json({ messages });
});

// Delete message
router.delete("/messages/:id", (req, res) => {
  db.prepare("DELETE FROM messages WHERE id = ?").run(req.params.id);
  res.json({ message: "Message deleted" });
});

// Get stats
router.get("/stats", (req, res) => {
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
  const groupCount = db.prepare("SELECT COUNT(*) as count FROM groups_table").get().count;
  const messageCount = db.prepare("SELECT COUNT(*) as count FROM messages").get().count;
  const pendingRequests = db.prepare("SELECT COUNT(*) as count FROM join_requests WHERE status = 'pending'").get().count;

  res.json({ userCount, groupCount, messageCount, pendingRequests });
});

module.exports = router;
