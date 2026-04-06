const express = require("express");  
const bcrypt = require("bcryptjs");  
const { dbGet, dbRun, dbAll } = require("../db");  
  
const router = express.Router();  
  
router.post("/login", async (req, res) => {  
  try {  
    const { password } = req.body;  
    if (!password) return res.status(400).json({ error: "Password required" });  
  
    const setting = await dbGet("SELECT * FROM admin_settings WHERE key = 'admin_password'");  
    if (!setting) return res.status(500).json({ error: "Admin not configured" });  
  
    if (!bcrypt.compareSync(password, setting.value)) {  
      return res.status(401).json({ error: "Wrong password" });  
    }  
    res.json({ success: true });  
  } catch (err) {  
    console.error("admin login error:", err);  
    res.status(500).json({ error: "Internal server error" });  
  }  
});  
  
router.post("/change-password", async (req, res) => {  
  try {  
    const { currentPassword, newPassword } = req.body;  
  
    const setting = await dbGet("SELECT * FROM admin_settings WHERE key = 'admin_password'");  
    if (!bcrypt.compareSync(currentPassword, setting.value)) {  
      return res.status(401).json({ error: "Current password is wrong" });  
    }  
  
    const hashed = bcrypt.hashSync(newPassword, 10);  
    await dbRun("UPDATE admin_settings SET value = ? WHERE key = 'admin_password'", [hashed]);  
    res.json({ message: "Password changed" });  
  } catch (err) {  
    console.error("change password error:", err);  
    res.status(500).json({ error: "Internal server error" });  
  }  
});  
  
router.get("/users", async (req, res) => {  
  try {  
    const users = await dbAll("SELECT id, username, avatar, created_at FROM users ORDER BY created_at DESC");  
    res.json({ users });  
  } catch (err) {  
    console.error("get users error:", err);  
    res.status(500).json({ error: "Internal server error" });  
  }  
});  
  
router.delete("/users/:id", async (req, res) => {  
  try {  
    await dbRun("DELETE FROM group_members WHERE user_id = ?", [req.params.id]);  
    await dbRun("DELETE FROM join_requests WHERE user_id = ?", [req.params.id]);  
    await dbRun("DELETE FROM messages WHERE user_id = ?", [req.params.id]);  
    await dbRun("DELETE FROM users WHERE id = ?", [req.params.id]);  
    res.json({ message: "User deleted" });  
  } catch (err) {  
    console.error("delete user error:", err);  
    res.status(500).json({ error: "Internal server error" });  
  }  
});  
  
router.get("/groups", async (req, res) => {  
  try {  
    const groups = await dbAll(`  
      SELECT g.*,  
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,  
        (SELECT username FROM users WHERE id = g.creator_id) as creator_name  
      FROM groups_table g  
      ORDER BY g.created_at DESC  
    `);  
    res.json({ groups });  
  } catch (err) {  
    console.error("get groups error:", err);  
    res.status(500).json({ error: "Internal server error" });  
  }  
});  
  
router.delete("/groups/:id", async (req, res) => {  
  try {  
    await dbRun("DELETE FROM messages WHERE group_id = ?", [req.params.id]);  
    await dbRun("DELETE FROM group_members WHERE group_id = ?", [req.params.id]);  
    await dbRun("DELETE FROM join_requests WHERE group_id = ?", [req.params.id]);  
    await dbRun("DELETE FROM groups_table WHERE id = ?", [req.params.id]);  
    res.json({ message: "Group deleted" });  
  } catch (err) {  
    console.error("delete group error:", err);  
    res.status(500).json({ error: "Internal server error" });  
  }  
});  
  
router.get("/messages", async (req, res) => {  
  try {  
    const messages = await dbAll(`  
      SELECT m.*, u.username, g.name as group_name  
      FROM messages m  
      JOIN users u ON m.user_id = u.id  
      JOIN groups_table g ON m.group_id = g.id  
      ORDER BY m.created_at DESC  
      LIMIT 100  
    `);  
    res.json({ messages });  
  } catch (err) {  
    console.error("get messages error:", err);  
    res.status(500).json({ error: "Internal server error" });  
  }  
});  
  
router.delete("/messages/:id", async (req, res) => {  
  try {  
    await dbRun("DELETE FROM messages WHERE id = ?", [req.params.id]);  
    res.json({ message: "Message deleted" });  
  } catch (err) {  
    console.error("delete message error:", err);  
    res.status(500).json({ error: "Internal server error" });  
  }  
});  
  
router.get("/stats", async (req, res) => {  
  try {  
    const userCount = (await dbGet("SELECT COUNT(*) as count FROM users")).count;  
    const groupCount = (await dbGet("SELECT COUNT(*) as count FROM groups_table")).count;  
    const messageCount = (await dbGet("SELECT COUNT(*) as count FROM messages")).count;  
    const pendingRequests = (await dbGet("SELECT COUNT(*) as count FROM join_requests WHERE status = 'pending'")).count;  
  
    res.json({ userCount, groupCount, messageCount, pendingRequests });  
  } catch (err) {  
    console.error("get stats error:", err);  
    res.status(500).json({ error: "Internal server error" });  
  }  
});  
  
module.exports = router;
