const express = require("express");
const multer = require("multer");
const path = require("path");
const controller = require("../controllers/automationController");
const automationState = require("../services/automationState");

const router = express.Router();

const upload = multer({
  dest: path.resolve(__dirname, "../../data/uploads")
});

router.get("/status", controller.getStatus);
router.get("/logs", controller.getLogs);
router.post("/start", controller.startAutomation);
router.post("/stop", controller.stopAutomation);
router.post("/upload", upload.single("file"), controller.uploadCsv);

// Server-Sent Events (SSE) stream for real-time live UI updates
router.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  automationState.addSseClient(res);

  req.on("close", () => {
    automationState.removeSseClient(res);
  });
});

module.exports = router;
