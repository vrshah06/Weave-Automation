const path = require("path");
const fs = require("fs");
const automationState = require("../services/automationState");
const pythonRunner = require("../services/pythonRunner");

exports.getStatus = (req, res) => {
  return res.json(automationState.getState());
};

exports.getLogs = (req, res) => {
  return res.json(automationState.getState().logs);
};

exports.startAutomation = (req, res) => {
  try {
    const { mode = "dry_run", csvFile } = req.body;
    const isSendMode = mode === "send";

    if (pythonRunner.isAutomationRunning()) {
      return res.status(400).json({
        error: "Automation is already running. Please stop it first."
      });
    }

    const rootDir = path.resolve(__dirname, "../../");
    let targetCsvPath = path.join(rootDir, "data", "appointments.csv");

    if (csvFile) {
      const customPath = path.join(rootDir, "data", csvFile);
      if (fs.existsSync(customPath)) {
        targetCsvPath = customPath;
      }
    }

    if (!fs.existsSync(targetCsvPath)) {
      return res.status(400).json({
        error: `CSV file not found at ${targetCsvPath}. Please upload a CSV first.`
      });
    }

    const result = pythonRunner.startAutomation({
      isSendMode,
      csvFilePath: targetCsvPath
    });

    return res.json({
      message: "Automation started successfully",
      pid: result.pid,
      mode: result.mode
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.stopAutomation = (req, res) => {
  try {
    const stopped = pythonRunner.stopAutomation();
    if (!stopped) {
      return res.status(400).json({ error: "No active automation process to stop." });
    }
    return res.json({ message: "Stop command issued successfully." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.uploadCsv = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const rootDir = path.resolve(__dirname, "../../");
    const dataDir = path.join(rootDir, "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const destinationPath = path.join(dataDir, "appointments.csv");
    fs.copyFileSync(req.file.path, destinationPath);

    // Clean up temp file
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {
      // Ignored
    }

    // Read and count valid CSV appointment rows
    const content = fs.readFileSync(destinationPath, "utf-8");
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    const rowCount = Math.max(0, lines.length - 1);

    // Reset state for new CSV file
    const originalName = req.file.originalname || "appointments.csv";
    automationState.reset();
    automationState.updateState({
      csvFile: originalName,
      total: rowCount,
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      remaining: rowCount,
      currentPatient: null,
      status: "idle",
      logs: []
    });

    automationState.addLog({
      action: "Upload",
      message: `Uploaded new CSV: ${originalName} (${rowCount} row${rowCount === 1 ? '' : 's'})`,
      status: "info"
    });

    return res.json({
      message: "CSV file uploaded successfully",
      filename: originalName,
      rowCount
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
