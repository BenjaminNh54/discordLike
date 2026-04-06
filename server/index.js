const express = require("express");  
const http = require("http");  
const { Server } = require("socket.io");  
const cors = require("cors");  
const path = require("path");  
const cookieParser = require("cookie-parser");  
const { dbGet, dbRun, initDb } = require("./db");  
const authRoutes = require("./routes/auth");  
const groupRoutes = require("./routes/groups");  
const messageRoutes = require("./routes/messages");  
const adminRoutes = require("./routes/admin");  
const uploadRoutes = require("./routes/upload");  
const { authenticateToken } = require("./middleware/auth");  
  
const app = express();  
const server = http.createServer(app);  
const io = new Server(server, {  
  cors: { origin: "*", methods: ["GET", "POST"] },  
  maxHttpBufferSize: 50 * 1024 * 1024,  
});  
  
app.use(cors());  
app.use(express.json());  
app.use(cookieParser());  
app.use("/uploads", express.static(path.join(__dirname, "uploads")));  
  
// Routes  
app.use("/api/auth", authRoutes);  
app.use("/api/groups", authenticateToken, groupRoutes);  
app.use("/api/messages", authenticateToken, messageRoutes);  
app.use("/api/admin", adminRoutes);  
app.use("/api/upload", authenticateToken, uploadRoutes);  
  
// Serve frontend in production  
if (process.env.NODE_ENV === "production") {  
  app.use(express.static(path.join(__dirname, "../client/dist")));  
  app.get("*path", (req, res) => {  
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));  
  });  
}  
  
// Socket.io  
const connectedUsers = new Map();  
  
io.use((socket, next) => {  
  const token = socket.handshake.auth.token;  
  if (!token) return next(new Error("Authentication error"));  
  const jwt = require("jsonwebtoken");  
  try {  
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "messochat_secret_key");  
    socket.userId = decoded.userId;  
    socket.username = decoded.username;  
    next();  
  } catch (err) {  
    next(new Error("Authentication error"));  
  }  
});  
  
io.on("connection", (socket) => {  
  connectedUsers.set(socket.userId, socket.id);  
  
  socket.on("join_group", (groupId) => {  
    socket.join(`group_${groupId}`);  
  });  
  
  socket.on("leave_group", (groupId) => {  
    socket.leave(`group_${groupId}`);  
  });  
  
  socket.on("send_message", async (data) => {  
    try {  
      const { groupId, content, type, fileUrl, fileName } = data;  
      const result = await dbRun(  
        "INSERT INTO messages (group_id, user_id, content, type, file_url, file_name) VALUES (?, ?, ?, ?, ?, ?)",  
        [groupId, socket.userId, content || "", type || "text", fileUrl || null, fileName || null]  
      );  
  
      const msg = await dbGet(  
        `SELECT m.*, u.username FROM messages m  
         JOIN users u ON m.user_id = u.id  
         WHERE m.id = ?`,  
        [result.lastInsertRowid]  
      );  
  
      io.to(`group_${groupId}`).emit("new_message", msg);  
    } catch (err) {  
      console.error("send_message error:", err);  
    }  
  });  
  
  socket.on("typing", (data) => {  
    socket.to(`group_${data.groupId}`).emit("user_typing", {  
      userId: socket.userId,  
      username: socket.username,  
      groupId: data.groupId,  
    });  
  });  
  
  socket.on("stop_typing", (data) => {  
    socket.to(`group_${data.groupId}`).emit("user_stop_typing", {  
      userId: socket.userId,  
      groupId: data.groupId,  
    });  
  });  
  
  socket.on("disconnect", () => {  
    connectedUsers.delete(socket.userId);  
  });  
});  
  
async function start() {  
  await initDb();  
  const PORT = process.env.PORT || 3001;  
  server.listen(PORT, () => {  
    console.log(`MessoChat server running on port ${PORT}`);  
  });  
}  
  
start();
