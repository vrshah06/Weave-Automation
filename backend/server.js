const express = require("express");
const cors = require("cors");
const path = require("path");
const automationRoutes = require("./routes/automationRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/automation", automationRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`WEAVE AUTOMATION BACKEND SERVER RUNNING`);
  console.log(`Port: http://localhost:${PORT}`);
  console.log(`API:  http://localhost:${PORT}/api/automation/status`);
  console.log(`==================================================`);
});
