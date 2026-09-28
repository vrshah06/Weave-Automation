import React, { useState, useRef } from "react";
import {
  Upload,
  Play,
  Square,
  FileText,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Clock,
  UserCheck
} from "lucide-react";

export default function Dashboard({ state, onStart, onStop, onModeChange }) {
  const [uploading, setUploading] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setImportSummary(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/import/csv", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setImportSummary(data.summary);
      } else {
        setError(data.error || "Import failed");
      }
    } catch (err) {
      setError("Network error uploading CSV");
    } finally {
      setUploading(false);
    }
  };

  const isRunning = ["starting", "logging_in", "running", "stopping"].includes(state.status);
  const progressPct = state.total > 0 ? Math.min(100, Math.round((state.processed / state.total) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* ERROR ALERT */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold text-rose-700">Dismiss</button>
        </div>
      )}

      {/* IMPORT SUMMARY BANNER */}
      {importSummary && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>CSV Import Success: {importSummary.imported} imported, {importSummary.duplicates} duplicate(s) skipped.</span>
          </div>
          <button onClick={() => setImportSummary(null)} className="font-bold text-emerald-700">Close</button>
        </div>
      )}

      {/* CONTROLS CARD */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* CSV Import */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              1. Import Appointment CSV
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv"
                className="hidden"
                disabled={isRunning}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isRunning || uploading}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-semibold text-slate-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Upload className="h-4 w-4 text-blue-600" />
                <span>{uploading ? "Importing to DB..." : "Upload CSV to Database"}</span>
              </button>
            </div>
          </div>

          {/* Mode Switcher */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              2. Execution Mode
            </label>
            <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => onModeChange("dry_run")}
                disabled={isRunning}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  state.mode === "dry_run"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Dry Run (Safe)
              </button>
              <button
                type="button"
                onClick={() => onModeChange("send")}
                disabled={isRunning}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  state.mode === "send"
                    ? "bg-rose-600 text-white shadow-md shadow-rose-500/20"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Send Messages (Live)
              </button>
            </div>
          </div>

          {/* Quick Start / Stop */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              3. Automation Control
            </label>
            <div>
              {!isRunning ? (
                <button
                  type="button"
                  onClick={onStart}
                  className={`px-6 py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition-all flex items-center gap-2 ${
                    state.mode === "send"
                      ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                      : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                  }`}
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Start Reminders</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStop}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-orange-600 hover:bg-orange-700 shadow-md shadow-orange-600/20 transition-all flex items-center gap-2"
                >
                  <Square className="h-4 w-4 fill-current" />
                  <span>Stop Reminders</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* METRICS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total</span>
          <span className="text-2xl font-extrabold text-slate-900 mt-1">{state.total}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Processed</span>
          <span className="text-2xl font-extrabold text-blue-600 mt-1">{state.processed}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">{state.mode === "send" ? "Sent" : "Verified"}</span>
          <span className="text-2xl font-extrabold text-emerald-600 mt-1">{state.sent}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Failed</span>
          <span className="text-2xl font-extrabold text-rose-600 mt-1">{state.failed}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Skipped</span>
          <span className="text-2xl font-extrabold text-amber-600 mt-1">{state.skipped}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Remaining</span>
          <span className="text-2xl font-extrabold text-slate-700 mt-1">{state.remaining}</span>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-sm">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-slate-600">Automation Progress</span>
          <span className="text-blue-600 font-bold">{progressPct}% Complete</span>
        </div>
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </section>

      {/* CURRENT PATIENT */}
      {state.currentPatient && isRunning && (
        <section className="bg-blue-50/80 border border-blue-200 rounded-2xl p-5 flex items-center justify-between gap-4 animate-pulse shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-700">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">Currently Processing</span>
              <h3 className="text-base font-bold text-slate-900">{state.currentPatient.name}</h3>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-500">Masked Phone</span>
            <p className="text-sm font-mono text-blue-700 font-bold">{state.currentPatient.phone}</p>
          </div>
        </section>
      )}
    </div>
  );
}
