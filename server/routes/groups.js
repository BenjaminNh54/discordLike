const express = require("express");
const db = require("../db");

const router = express.Router();

// Create a group
router.post("/", (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: "Group name required" });

  const result = db.prepare(
    "INSERT INTO groups_table (name, description, creator_id) VALUES (?, ?, ?)"
  ).run(name, description || "", req.userId);

  // Add creator as admin member
  db.prepare(
    "INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'admin')"
  ).run(result.lastInsertRowid, req.userId);

  const group = db.prepare("SELECT * FROM groups_table WHERE id = ?").get(result.lastInsertRowid);
  res.json({ group });
});

// Get my groups
router.get("/my", (req, res) => {
  const groups = db.prepare(`
    SELECT g.*, gm.role,
      (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
    FROM groups_table g
    JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = ?
    ORDER BY g.created_at DESC
  `).all(req.userId);
  res.json({ groups });
});

// Get all groups (for browsing/joining)
router.get("/all", (req, res) => {
  const groups = db.prepare(`
    SELECT g.*,
      (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
      (SELECT username FROM users WHERE id = g.creator_id) as creator_name,
      (SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND user_id = ?) as is_member,
      (SELECT COUNT(*) FROM join_requests WHERE group_id = g.id AND user_id = ? AND status = 'pending') as has_pending_request
    FROM groups_table g
    ORDER BY g.created_at DESC
  `).all(req.userId, req.userId);
  res.json({ groups });
});

// Get group details
router.get("/:id", (req, res) => {
  const group = db.prepare(`
    SELECT g.*,
      (SELECT username FROM users WHERE id = g.creator_id) as creator_name
    FROM groups_table g WHERE g.id = ?
  `).get(req.params.id);

  if (!group) return res.status(404).json({ error: "Group not found" });

  const members = db.prepare(`
    SELECT u.id, u.username, u.avatar, gm.role, gm.joined_at
    FROM group_members gm
    JOIN users u ON gm.user_id = u.id
    WHERE gm.group_id = ?
    ORDER BY gm.role DESC, gm.joined_at ASC
  `).all(req.params.id);

  const isMember = members.some((m) => m.id === req.userId);

  res.json({ group, members, isMember });
});

// Request to join a group
router.post("/:id/join", (req, res) => {
  const groupId = req.params.id;

  const existing = db.prepare(
    "SELECT * FROM group_members WHERE group_id = ? AND user_id = ?"
  ).get(groupId, req.userId);
  if (existing) return res.status(400).json({ error: "Already a member" });

  const pendingRequest = db.prepare(
    "SELECT * FROM join_requests WHERE group_id = ? AND user_id = ? AND status = 'pending'"
  ).get(groupId, req.userId);
  if (pendingRequest) return res.status(400).json({ error: "Request already pending" });

  db.prepare(
    "INSERT OR REPLACE INTO join_requests (group_id, user_id, status) VALUES (?, ?, 'pending')"
  ).run(groupId, req.userId);

  res.json({ message: "Join request sent" });
});

// Get pending join requests (admin only)
router.get("/:id/requests", (req, res) => {
  const group = db.prepare("SELECT * FROM groups_table WHERE id = ?").get(req.params.id);
  if (!group || group.creator_id !== req.userId) {
    return res.status(403).json({ error: "Not authorized" });
  }

  const requests = db.prepare(`
    SELECT jr.*, u.username, u.avatar
    FROM join_requests jr
    JOIN users u ON jr.user_id = u.id
    WHERE jr.group_id = ? AND jr.status = 'pending'
    ORDER BY jr.created_at DESC
  `).all(req.params.id);

  res.json({ requests });
});

// Accept/reject join request
router.post("/:id/requests/:requestId", (req, res) => {
  const { action } = req.body; // 'accept' or 'reject'
  const group = db.prepare("SELECT * FROM groups_table WHERE id = ?").get(req.params.id);
  if (!group || group.creator_id !== req.userId) {
    return res.status(403).json({ error: "Not authorized" });
  }

  const request = db.prepare("SELECT * FROM join_requests WHERE id = ?").get(req.params.requestId);
  if (!request) return res.status(404).json({ error: "Request not found" });

  if (action === "accept") {
    db.prepare("UPDATE join_requests SET status = 'accepted' WHERE id = ?").run(req.params.requestId);
    db.prepare(
      "INSERT OR IGNORE INTO group_members (group_id, user_id, role) VALUES (?, ?, 'member')"
    ).run(req.params.id, request.user_id);
    res.json({ message: "Request accepted" });
  } else if (action === "reject") {
    db.prepare("UPDATE join_requests SET status = 'rejected' WHERE id = ?").run(req.params.requestId);
    res.json({ message: "Request rejected" });
  } else {
    res.status(400).json({ error: "Invalid action" });
  }
});

// Delete group (admin only)
router.delete("/:id", (req, res) => {
  const group = db.prepare("SELECT * FROM groups_table WHERE id = ?").get(req.params.id);
  if (!group || group.creator_id !== req.userId) {
    return res.status(403).json({ error: "Not authorized" });
  }
  db.prepare("DELETE FROM groups_table WHERE id = ?").run(req.params.id);
  res.json({ message: "Group deleted" });
});

// Remove member (admin only)
router.delete("/:id/members/:userId", (req, res) => {
  const group = db.prepare("SELECT * FROM groups_table WHERE id = ?").get(req.params.id);
  if (!group || group.creator_id !== req.userId) {
    return res.status(403).json({ error: "Not authorized" });
  }
  if (parseInt(req.params.userId) === req.userId) {
    return res.status(400).json({ error: "Cannot remove yourself" });
  }
  db.prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = ?").run(req.params.id, req.params.userId);
  res.json({ message: "Member removed" });
});

module.exports = router;
