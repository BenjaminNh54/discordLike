const express = require("express");  
const { dbGet, dbAll, dbRun } = require("../db");  
  
const router = express.Router();  
  
router.get("/:groupId", async (req, res) => {  
  try {  
    const groupId = req.params.groupId;  
  
    const member = await dbGet(  
      "SELECT * FROM group_members WHERE group_id = ? AND user_id = ?",  
      [groupId, req.userId]  
    );  
    if (!member) return res.status(403).json({ error: "Not a member" });  
  
    const limit = parseInt(req.query.limit) || 50;  
    const before = req.query.before;  
  
    let messages;  
    if (before) {  
      messages = await dbAll(`  
        SELECT m.*, u.username, u.avatar as user_avatar  
        FROM messages m  
        JOIN users u ON m.user_id = u.id  
        WHERE m.group_id = ? AND m.id < ?  
        ORDER BY m.id DESC  
        LIMIT ?  
      `, [groupId, before, limit]);  
    } else {  
      messages = await dbAll(`  
        SELECT m.*, u.username, u.avatar as user_avatar  
        FROM messages m  
        JOIN users u ON m.user_id = u.id  
        WHERE m.group_id = ?  
        ORDER BY m.id DESC  
        LIMIT ?  
      `, [groupId, limit]);  
    }  
  
    res.json({ messages: messages.reverse() });  
  } catch (err) {  
    console.error("get messages error:", err);  
    res.status(500).json({ error: "Internal server error" });  
  }  
});  
  
router.delete("/:messageId", async (req, res) => {  
  try {  
    const message = await dbGet("SELECT * FROM messages WHERE id = ?", [req.params.messageId]);  
    if (!message) return res.status(404).json({ error: "Message not found" });  
  
    const group = await dbGet("SELECT * FROM groups_table WHERE id = ?", [message.group_id]);  
  
    if (message.user_id !== req.userId && group.creator_id !== req.userId) {  
      return res.status(403).json({ error: "Not authorized" });  
    }  
  
    await dbRun("DELETE FROM messages WHERE id = ?", [req.params.messageId]);  
    res.json({ message: "Deleted" });  
  } catch (err) {  
    console.error("delete message error:", err);  
    res.status(500).json({ error: "Internal server error" });  
  }  
});  
  
module.exports = router;
