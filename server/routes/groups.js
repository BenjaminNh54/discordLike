const express = require("express");  
const { dbGet, dbRun, dbAll } = require("../db");  
  
const router = express.Router();  
  
router.post("/", async (req, res) => {  
  try {  
    const { name, description } = req.body;  
    if (!name) return res.status(400).json({ error: "Group name required" });  
  
    const result = await dbRun(  
      "INSERT INTO groups_table (name, description, creator_id) VALUES (?, ?, ?)",  
      [name, description || "", req.userId]  
    );  
  
    await dbRun(  
      "INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'admin')",  
      [result.lastInsertRowid, req.userId]  
    );  
  
    const group = await dbGet("SELECT * FROM groups_table WHERE id = ?", [result.lastInsertRowid]);  
    res.json({ group });  
  } catch (err) {  
    console.error("create group error:", err);  
    res.status(500).json({ error: "Internal server error" });  
  }  
});  
  
router.get("/my", async (req, res) => {  
  try {  
    const groups = await dbAll(`  
      SELECT g.*, gm.role,  
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count  
      FROM groups_table g  
      JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = ?  
      ORDER BY g.created_at DESC  
    `, [req.userId]);  
    res.json({ groups });  
  } catch (err) {  
    console.error("get my groups error:", err);  
    res.status(500).json({ error: "Internal server error" });  
  }  
});  
  
router.get("/all", async (req, res) => {  
  try {  
    const groups = await dbAll(`  
      SELECT g.*,  
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,  
        (SELECT username FROM users WHERE id = g.creator_id) as creator_name,  
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND user_id = ?) as is_member,  
        (SELECT COUNT(*) FROM join_requests WHERE group_id = g.id AND user_id = ? AND status = 'pending') as has_pending_request  
      FROM groups_table g  
      ORDER BY g.created_at DESC  
    `, [req.userId, req.userId]);  
    res.json({ groups });  
  } catch (err) {  
    console.error("get all groups error:", err);  
    res.status(500).json({ error: "Internal server error" });  
  }  
});  
  
router.get("/:id", async (req, res) => {  
  try {  
    const group = await dbGet(`  
      SELECT g.*,  
        (SELECT username FROM users WHERE id = g.creator_id) as creator_name  
      FROM groups_table g WHERE g.id = ?  
    `, [req.params.id]);  
  
    if (!group) return res.status(404).json({ error: "Group not found" });  
  
    const members = await dbAll(`  
      SELECT u.id, u.username, u.avatar, gm.role, gm.joined_at  
      FROM group_members gm  
      JOIN users u ON gm.user_id = u.id  
      WHERE gm.group_id = ?  
      ORDER BY gm.role DESC, gm.joined_at ASC  
    `, [req.params.id]);  
  
    const isMember = members.some((m) => m.id === req.userId);  
    res.json({ group, members, isMember });  
  } catch (err) {  
    console.error("get group error:", err);  
    res.status(500).json({ error: "Internal server error" });  
  }  
});  
  
router.post("/:id/join", async (req, res) => {  
  try {  
    const groupId = req.params.id;  
  
    const existing = await dbGet(  
      "SELECT * FROM group_members WHERE group_id = ? AND user_id = ?",  
      [groupId, req.userId]  
    );  
    if (existing) return res.status(400).json({ error: "Already a member" });  
  
    const pendingRequest = await dbGet(  
      "SELECT * FROM join_requests WHERE group_id = ? AND user_id = ? AND status = 'pending'",  
      [groupId, req.userId]  
    );  
    if (pendingRequest) return res.status(400).json({ error: "Request already pending" });  
  
    await dbRun(  
      "INSERT OR REPLACE INTO join_requests (group_id, user_id, status) VALUES (?, ?, 'pending')",  
      [groupId, req.userId]  
    );  
    res.json({ message: "Join request sent" });  
  } catch (err) {  
    console.error("join group error:", err);  
    res.status(500).json({ error: "Internal server error" });  
  }  
});  
  
router.get("/:id/requests", async (req, res) => {  
  try {  
    const group = await dbGet("SELECT * FROM groups_table WHERE id = ?", [req.params.id]);  
    if (!group || group.creator_id !== req.userId) {  
      return res.status(403).json({ error: "Not authorized" });  
    }  
  
    const requests = await dbAll(`  
      SELECT jr.*, u.username, u.avatar  
      FROM join_requests jr  
      JOIN users u ON jr.user_id = u.id  
      WHERE jr.group_id = ? AND jr.status = 'pending'  
      ORDER BY jr.created_at DESC  
    `, [req.params.id]);  
    res.json({ requests });  
  } catch (err) {  
    console.error("get requests error:", err);  
    res.status(500).json({ error: "Internal server error" });  
  }  
});  
  
router.post("/:id/requests/:requestId", async (req, res) => {  
  try {  
    const { action } = req.body;  
    const group = await dbGet("SELECT * FROM groups_table WHERE id = ?", [req.params.id]);  
    if (!group || group.creator_id !== req.userId) {  
      return res.status(403).json({ error: "Not authorized" });  
    }  
  
    const request = await dbGet("SELECT * FROM join_requests WHERE id = ?", [req.params.requestId]);  
    if (!request) return res.status(404).json({ error: "Request not found" });  
  
    if (action === "accept") {  
      await dbRun("UPDATE join_requests SET status = 'accepted' WHERE id = ?", [req.params.requestId]);  
      await dbRun(  
        "INSERT OR IGNORE INTO group_members (group_id, user_id, role) VALUES (?, ?, 'member')",  
        [req.params.id, request.user_id]  
      );  
      res.json({ message: "Request accepted" });  
    } else if (action === "reject") {  
      await dbRun("UPDATE join_requests SET status = 'rejected' WHERE id = ?", [req.params.requestId]);  
      res.json({ message: "Request rejected" });  
    } else {  
      res.status(400).json({ error: "Invalid action" });  
    }  
  } catch (err) {  
    console.error("handle request error:", err);  
    res.status(500).json({ error: "Internal server error" });  
  }  
});  
  
router.delete("/:id", async (req, res) => {  
  try {  
    const group = await dbGet("SELECT * FROM groups_table WHERE id = ?", [req.params.id]);  
    if (!group || group.creator_id !== req.userId) {  
      return res.status(403).json({ error: "Not authorized" });  
    }  
    await dbRun("DELETE FROM groups_table WHERE id = ?", [req.params.id]);  
    res.json({ message: "Group deleted" });  
  } catch (err) {  
    console.error("delete group error:", err);  
    res.status(500).json({ error: "Internal server error" });  
  }  
});  
  
router.delete("/:id/members/:userId", async (req, res) => {  
  try {  
    const group = await dbGet("SELECT * FROM groups_table WHERE id = ?", [req.params.id]);  
    if (!group || group.creator_id !== req.userId) {  
      return res.status(403).json({ error: "Not authorized" });  
    }  
    if (parseInt(req.params.userId) === req.userId) {  
      return res.status(400).json({ error: "Cannot remove yourself" });  
    }  
    await dbRun("DELETE FROM group_members WHERE group_id = ? AND user_id = ?", [req.params.id, req.params.userId]);  
    res.json({ message: "Member removed" });  
  } catch (err) {  
    console.error("remove member error:", err);  
    res.status(500).json({ error: "Internal server error" });  
  }  
});  
  
module.exports = router;
