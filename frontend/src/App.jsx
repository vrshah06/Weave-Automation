import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  UserCheck,
  ShieldCheck,
  Zap,
  RefreshCw,
  Info
} from 'lucide-react';

export default function App() {
  const [state, setState] = useState({
    status: 'idle',
    mode: 'dry_run',
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
    csvFile: 'appointments.csv',
    logs: []
  });

  const [selectedMode, setSelectedMode] = useState('dry_run'); // dry_run or send
  const [uploading, setUploading] = useState(false);
  const [showSendConfirmModal, setShowSendConfirmModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const fileInputRef = useRef(null);
  const logContainerRef = useRef(null);

  // Auto-scroll logs container to bottom on update
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [state.logs]);

  // Connect to Server-Sent Events (SSE) for live updates
  useEffect(() => {
    let eventSource = new EventSource('/api/automation/events');

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'init' || data.type === 'state_update') {
          setState((prev) => {
            const newState = { ...prev, ...data.state };
            if (newState.status === 'completed' && prev.status === 'running') {
              setShowSummaryModal(true);
            }
            return newState;
          });
        } else if (data.type === 'log') {
          setState((prev) => ({
            ...prev,
            logs: [...prev.logs, data.log]
          }));
        }
      } catch (err) {
        console.error('Failed to parse SSE payload:', err);
      }
    };

    eventSource.onerror = () => {
      console.warn('SSE connection interrupted, retrying...');
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Fetch initial status on mount
  useEffect(() => {
    fetch('/api/automation/status')
      .then((res) => res.json())
      .then((data) => {
        setState(data);
        if (data.mode) setSelectedMode(data.mode);
      })
      .catch((err) => console.error('Error fetching initial status:', err));
  }, []);

  // File upload handler
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setErrorMessage('Please upload a valid CSV file (.csv)');
      return;
    }

    setUploading(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/automation/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setState((prev) => ({
          ...prev,
          csvFile: data.filename,
          total: data.rowCount,
          remaining: data.rowCount,
          processed: 0,
          sent: 0,
          failed: 0,
          skipped: 0,
          currentPatient: null,
          status: 'idle',
          logs: []
        }));
      } else {
        setErrorMessage(data.error || 'Upload failed');
      }
    } catch (err) {
      setErrorMessage('Network error while uploading file');
    } finally {
      setUploading(false);
    }
  };

  // Start automation trigger
  const handleStartRequest = () => {
    setErrorMessage(null);
    if (selectedMode === 'send') {
      setShowSendConfirmModal(true);
    } else {
      executeStart('dry_run');
    }
  };

  const executeStart = async (mode) => {
    setShowSendConfirmModal(false);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/automation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to start automation');
      }
    } catch (err) {
      setErrorMessage('Network error while starting automation');
    }
  };

  // Stop automation trigger
  const handleStopRequest = async () => {
    try {
      const res = await fetch('/api/automation/stop', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to stop automation');
      }
    } catch (err) {
      setErrorMessage('Network error while stopping automation');
    }
  };

  const isRunning = ['starting', 'logging_in', 'running', 'stopping'].includes(state.status);
  const progressPct = state.total > 0 ? Math.min(100, Math.round((state.processed / state.total) * 100)) : 0;

  // Status Badge Colors & Labels
  const getStatusBadge = () => {
    switch (state.status) {
      case 'starting':
        return { label: 'Starting Process...', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30 ring-amber-500/20', animate: true };
      case 'logging_in':
        return { label: 'Logging in to Weave...', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30 ring-blue-500/20', animate: true };
      case 'running':
        return { label: state.mode === 'send' ? 'Sending Messages...' : 'Running Dry Run...', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 ring-emerald-500/20', animate: true };
      case 'stopping':
        return { label: 'Stopping Automation...', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30 ring-orange-500/20', animate: true };
      case 'completed':
        return { label: 'Automation Completed', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', animate: false };
      case 'failed':
        return { label: 'Failed / Error', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40', animate: false };
      case 'stopped':
        return { label: 'Stopped', color: 'bg-slate-500/20 text-slate-300 border-slate-500/40', animate: false };
      default:
        return { label: 'Ready', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', animate: false };
    }
  };

  const statusInfo = getStatusBadge();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Weave Appointment Reminders
              </h1>
              <p className="text-xs text-slate-400">Playwright Web Automation Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-2 ${statusInfo.color}`}>
              {statusInfo.animate && <span className="h-2 w-2 rounded-full bg-current animate-ping" />}
              <span>{statusInfo.label}</span>
            </div>

            <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
              <span>Mode: <strong className={selectedMode === 'send' ? 'text-rose-400' : 'text-blue-400'}>{selectedMode === 'send' ? 'PRODUCTION SEND' : 'DRY RUN'}</strong></span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* ERROR ALERT */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white text-xs font-bold">
              Dismiss
            </button>
          </div>
        )}

        {/* CONTROLS SECTION */}
        <section className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* CSV Upload */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                1. Appointment CSV File
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
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 text-sm font-medium text-slate-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="h-4 w-4 text-blue-400" />
                  <span>{uploading ? 'Uploading...' : 'Choose CSV File'}</span>
                </button>

                <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span className="font-mono text-blue-300">{state.csvFile || 'appointments.csv'}</span>
                </div>
              </div>
            </div>

            {/* Mode Switcher */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                2. Execution Mode
              </label>
              <div className="inline-flex p-1 rounded-xl bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedMode('dry_run')}
                  disabled={isRunning}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    selectedMode === 'dry_run'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Dry Run (Safe)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMode('send')}
                  disabled={isRunning}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    selectedMode === 'send'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Send Messages (Live)
                </button>
              </div>
            </div>

            {/* Start / Stop Buttons */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                3. Action Controls
              </label>
              <div className="flex items-center gap-3">
                {!isRunning ? (
                  <button
                    type="button"
                    onClick={handleStartRequest}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all flex items-center gap-2 ${
                      selectedMode === 'send'
                        ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                        : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
                    }`}
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>Start Automation</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopRequest}
                    className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-orange-600 hover:bg-orange-500 shadow-lg shadow-orange-600/20 transition-all flex items-center gap-2"
                  >
                    <Square className="h-4 w-4 fill-current" />
                    <span>Stop Automation</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* PROGRESS BAR & STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Total</span>
            <span className="text-2xl font-extrabold text-white mt-1">{state.total}</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Processed</span>
            <span className="text-2xl font-extrabold text-blue-400 mt-1">{state.processed}</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">{selectedMode === 'send' ? 'Sent' : 'Verified'}</span>
            <span className="text-2xl font-extrabold text-emerald-400 mt-1">{state.sent}</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Failed</span>
            <span className="text-2xl font-extrabold text-rose-400 mt-1">{state.failed}</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Skipped</span>
            <span className="text-2xl font-extrabold text-amber-400 mt-1">{state.skipped}</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Remaining</span>
            <span className="text-2xl font-extrabold text-slate-300 mt-1">{state.remaining}</span>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-slate-400">Automation Progress</span>
            <span className="text-blue-400 font-bold">{progressPct}% Complete</span>
          </div>
          <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </section>

        {/* CURRENTLY PROCESSING CARD */}
        {state.currentPatient && isRunning && (
          <section className="bg-blue-950/30 border border-blue-500/30 rounded-2xl p-5 flex items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider">Currently Processing</span>
                <h3 className="text-base font-bold text-white">{state.currentPatient.name}</h3>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono text-slate-400">Masked Contact</span>
              <p className="text-sm font-mono text-blue-300 font-bold">{state.currentPatient.phone}</p>
            </div>
          </section>
        )}

        {/* LIVE ACTIVITY LOG TABLE */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <span>Live Activity Log</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">{state.logs.length} entries</span>
          </div>

          <div ref={logContainerRef} className="h-80 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/80 p-2">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3 font-semibold">Time</th>
                  <th className="py-2 px-3 font-semibold">Patient</th>
                  <th className="py-2 px-3 font-semibold">Action</th>
                  <th className="py-2 px-3 font-semibold">Status</th>
                  <th className="py-2 px-3 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {state.logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No activity logs yet. Click "Start Automation" to begin.
                    </td>
                  </tr>
                ) : (
                  state.logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-2 px-3 font-mono text-slate-500">{log.time}</td>
                      <td className="py-2 px-3 font-medium text-slate-200">{log.patient || 'System'}</td>
                      <td className="py-2 px-3 text-slate-300">{log.action}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.status === 'sent' || log.status === 'dry_run' || log.status === 'success'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : log.status === 'failed' || log.status === 'error'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : log.status === 'skipped' || log.status === 'warning'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {log.status === 'sent' || log.status === 'dry_run' || log.status === 'success' ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : log.status === 'failed' || log.status === 'error' ? (
                            <XCircle className="h-3 w-3" />
                          ) : null}
                          {log.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400 font-mono text-[11px] truncate max-w-xs">{log.message}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* CONFIRMATION MODAL FOR LIVE SEND MODE */}
      {showSendConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-bold text-white">Confirm Live SMS Sending</h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              You are about to launch automation in <strong className="text-rose-400">PRODUCTION SEND MODE</strong>. Real SMS messages will be typed and sent to patients via Weave.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSendConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeStart('send')}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-600/30"
              >
                Yes, Start Sending Live SMS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FINAL SUMMARY MODAL */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-400">
              <CheckCircle2 className="h-7 w-7 shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-white">Automation Completed</h3>
                <p className="text-xs text-slate-400">Final execution breakdown</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
              <div>
                <span className="text-xs text-slate-500 uppercase">Total</span>
                <p className="text-lg font-extrabold text-white">{state.total}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase">{state.mode === 'send' ? 'Sent' : 'Verified'}</span>
                <p className="text-lg font-extrabold text-emerald-400">{state.sent}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase">Failed</span>
                <p className="text-lg font-extrabold text-rose-400">{state.failed}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase">Skipped</span>
                <p className="text-lg font-extrabold text-amber-400">{state.skipped}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-600/20"
              >
                Done / Run Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
