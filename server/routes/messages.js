const express = require("express");
const db = require("../db");

const router = express.Router();

// Get messages for a group
router.get("/:groupId", (req, res) => {
  const groupId = req.params.groupId;

  // Check membership
  const member = db.prepare(
    "SELECT * FROM group_members WHERE group_id = ? AND user_id = ?"
  ).get(groupId, req.userId);
  if (!member) return res.status(403).json({ error: "Not a member" });

  const limit = parseInt(req.query.limit) || 50;
  const before = req.query.before;

  let messages;
  if (before) {
    messages = db.prepare(`
      SELECT m.*, u.username, u.avatar as user_avatar
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.group_id = ? AND m.id < ?
      ORDER BY m.id DESC
      LIMIT ?
    `).all(groupId, before, limit);
  } else {
    messages = db.prepare(`
      SELECT m.*, u.username, u.avatar as user_avatar
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.group_id = ?
      ORDER BY m.id DESC
      LIMIT ?
    `).all(groupId, limit);
  }

  res.json({ messages: messages.reverse() });
});

// Delete a message (own or admin)
router.delete("/:messageId", (req, res) => {
  const message = db.prepare("SELECT * FROM messages WHERE id = ?").get(req.params.messageId);
  if (!message) return res.status(404).json({ error: "Message not found" });

  const group = db.prepare("SELECT * FROM groups_table WHERE id = ?").get(message.group_id);

  if (message.user_id !== req.userId && group.creator_id !== req.userId) {
    return res.status(403).json({ error: "Not authorized" });
  }

  db.prepare("DELETE FROM messages WHERE id = ?").run(req.params.messageId);
  res.json({ message: "Deleted" });
});

module.exports = router;
