import React, { useRef, useEffect } from "react";
import { PlayCircle, Clock, CheckCircle2, XCircle, AlertTriangle, UserCheck } from "lucide-react";

export default function Automation({ state }) {
  const logContainerRef = useRef(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [state.logs]);

  const isRunning = ["starting", "logging_in", "running", "stopping"].includes(state.status);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
            <PlayCircle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Live Execution Monitor</h2>
            <p className="text-xs text-slate-500">Real-time Socket.IO / SSE stream from Playwright worker</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
          <span>Status:</span>
          <strong className="text-blue-600 capitalize">{state.status}</strong>
        </div>
      </div>

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

      {/* LOG STREAM TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <span>Real-time Activity Stream</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">{state.logs.length} entries</span>
        </div>

        <div ref={logContainerRef} className="h-96 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-100 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Patient</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {state.logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No active automation stream. Click "Start Reminders" to initiate.
                  </td>
                </tr>
              ) : (
                state.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-100/60 transition-colors">
                    <td className="py-2 px-3 font-mono text-slate-500">{log.time}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{log.patient || "System"}</td>
                    <td className="py-2 px-3 text-slate-700">{log.action}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === "sent" || log.status === "dry_run" || log.status === "success"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : log.status === "failed" || log.status === "error"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : log.status === "skipped" || log.status === "warning"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600 font-mono text-[11px] truncate max-w-xs">{log.message}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
