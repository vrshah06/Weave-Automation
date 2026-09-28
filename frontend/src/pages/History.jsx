import React, { useState, useEffect } from "react";
import { History as HistoryIcon, Calendar, CheckCircle2, XCircle, AlertTriangle, FileText } from "lucide-react";

export default function History() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/automation/runs")
      .then((res) => res.json())
      .then((data) => setRuns(data || []))
      .catch((err) => console.error("Error fetching runs:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
            <HistoryIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Automation Run History</h2>
            <p className="text-xs text-slate-500">Audit logs for all past execution runs</p>
          </div>
        </div>
        <span className="text-xs font-mono text-slate-500">{runs.length} Runs Recorded</span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Run Date</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Selected</th>
                <th className="py-3 px-4">Sent</th>
                <th className="py-3 px-4">Confirmed</th>
                <th className="py-3 px-4">Failed</th>
                <th className="py-3 px-4">Skipped</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Loading historical runs from MongoDB...
                  </td>
                </tr>
              ) : runs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No past automation runs found.
                  </td>
                </tr>
              ) : (
                runs.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                      {new Date(r.startedAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 uppercase font-semibold text-blue-700">{r.mode}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{r.totalSelected}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600">{r.totalSent}</td>
                    <td className="py-3 px-4 font-bold text-emerald-700">{r.totalConfirmed}</td>
                    <td className="py-3 px-4 font-bold text-rose-600">{r.totalFailed}</td>
                    <td className="py-3 px-4 font-bold text-amber-600">{r.totalSkipped}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          r.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : r.status === "FAILED"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
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
