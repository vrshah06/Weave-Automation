import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

// Pages
import Dashboard from "./pages/Dashboard";
import Appointments from "./pages/Appointments";
import Patients from "./pages/Patients";
import Automation from "./pages/Automation";
import History from "./pages/History";
import Confirmations from "./pages/Confirmations";
import FailedRetry from "./pages/FailedRetry";
import Settings from "./pages/Settings";

export default function App() {
  const [state, setState] = useState({
    status: "idle",
    mode: "dry_run",
    total: 0,
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    remaining: 0,
    currentPatient: null,
    startedAt: null,
    completedAt: null,
    error: null,
    csvFile: "appointments.csv",
    logs: []
  });

  // Connect to SSE for real-time live events
  useEffect(() => {
    let eventSource = new EventSource("/api/automation/events");

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "init" || data.type === "state_update") {
          setState((prev) => ({ ...prev, ...data.state }));
        } else if (data.type === "log") {
          setState((prev) => ({
            ...prev,
            logs: [...prev.logs, data.log]
          }));
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Fetch initial status on mount
  useEffect(() => {
    fetch("/api/automation/status")
      .then((res) => res.json())
      .then((data) => {
        if (data) setState(data);
      })
      .catch((err) => console.error("Error fetching status:", err));
  }, []);

  const handleStart = async (date = null) => {
    try {
      await fetch("/api/automation/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: state.mode, date })
      });
    } catch (err) {
      console.error("Error starting automation:", err);
    }
  };

  const handleStop = async () => {
    try {
      await fetch("/api/automation/stop", { method: "POST" });
    } catch (err) {
      console.error("Error stopping automation:", err);
    }
  };

  const handleModeChange = (mode) => {
    setState((prev) => ({ ...prev, mode }));
  };

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
        <Navbar status={state.status} mode={state.mode} />

        <div className="flex flex-1">
          <Sidebar />

          <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
            <Routes>
              <Route
                path="/"
                element={
                  <Dashboard
                    state={state}
                    onStart={() => handleStart()}
                    onStop={handleStop}
                    onModeChange={handleModeChange}
                  />
                }
              />
              <Route
                path="/appointments"
                element={<Appointments onStartWithDate={(date) => handleStart(date)} />}
              />
              <Route path="/patients" element={<Patients />} />
              <Route path="/automation" element={<Automation state={state} />} />
              <Route path="/history" element={<History />} />
              <Route path="/confirmations" element={<Confirmations />} />
              <Route path="/failed" element={<FailedRetry />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
