const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, crypto.randomUUID() + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

router.post("/", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const fileUrl = `/uploads/${req.file.filename}`;
  const originalName = req.file.originalname;
  const mimeType = req.file.mimetype;

  let type = "file";
  if (mimeType.startsWith("image/")) type = "image";
  else if (mimeType.startsWith("video/")) type = "video";
  else if (mimeType.startsWith("audio/")) type = "audio";

  res.json({
    fileUrl,
    fileName: originalName,
    type,
    mimeType,
  });
});

module.exports = router;
