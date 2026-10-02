import React, { useState, useEffect } from "react";
import { CheckCircle2, ShieldCheck, Clock, RefreshCw, AlertTriangle, FileCheck, Check } from "lucide-react";

export default function Confirmations() {
  const [runData, setRunData] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [notification, setNotification] = useState(null);

  const fetchLastRunConfirmations = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/automation/confirmations/last");
      const data = await res.json();
      if (res.ok) {
        setRunData(data.run);
        setItems(data.items || []);
      }
    } catch (err) {
      console.error("Error fetching confirmations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLastRunConfirmations();
  }, []);

  const handleTriggerVerification = async () => {
    setVerifying(true);
    setNotification(null);
    try {
      const res = await fetch("/api/automation/confirmations/verify", {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({
          type: "success",
          text: data.message || `Successfully verified ${data.confirmedCount} confirmation(s).`
        });
        await fetchLastRunConfirmations();
      } else {
        setNotification({ type: "error", text: data.error || "Failed to verify confirmations." });
      }
    } catch (err) {
      setNotification({ type: "error", text: "Network error triggering verification." });
    } finally {
      setVerifying(false);
    }
  };

  const totalCount = items.length;
  const confirmedCount = items.filter((i) => i.status === "CONFIRMED").length;
  const pendingCount = items.filter((i) => i.status === "SENT" || i.status === "PENDING").length;
  const failedCount = items.filter((i) => i.status === "FAILED").length;
  const confirmationRate = totalCount > 0 ? Math.round((confirmedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Message Confirmations (Last Run)</h2>
            <p className="text-xs text-slate-500">Automated Playwright status verification and MongoDB sync</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTriggerVerification}
          disabled={verifying}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${verifying ? "animate-spin" : ""}`} />
          <span>{verifying ? "Syncing & Verifying..." : "Check & Verify Confirmations Now"}</span>
        </button>
      </div>

      {/* NOTIFICATION */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border shadow-sm ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="font-bold">Dismiss</button>
        </div>
      )}

      {/* METRICS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total Messages</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{totalCount}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Auto-Confirmed</span>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{confirmedCount}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Pending Verification</span>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{pendingCount}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Confirmation Rate</span>
          <p className="text-2xl font-extrabold text-blue-600 mt-1">{confirmationRate}%</p>
        </div>
      </div>

      {/* RUN DETAILS METADATA */}
      {runData && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between text-xs text-slate-600 shadow-sm">
          <div className="flex items-center gap-4">
            <span className="font-bold text-slate-800">Last Execution Run:</span>
            <span className="font-mono bg-white px-2.5 py-1 rounded border border-slate-200">
              {new Date(runData.startedAt).toLocaleString()}
            </span>
            <span className="uppercase font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {runData.mode}
            </span>
          </div>
          <span className="font-mono text-slate-400 text-[11px]">Run ID: {runData._id}</span>
        </div>
      )}

      {/* CONFIRMATION TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Patient Name</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4">Appointment Date & Time</th>
                <th className="py-3 px-4">Sent Time</th>
                <th className="py-3 px-4">Confirmed Time</th>
                <th className="py-3 px-4">Confirmation Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading confirmation log from MongoDB...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No confirmation records found for the latest run. Click "Start Reminders" on the Dashboard to execute a run.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{item.patientName}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{item.phone}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {item.appointmentDate} {item.appointmentTime && `at ${item.appointmentTime}`}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {item.sentAt ? new Date(item.sentAt).toLocaleTimeString() : "-"}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-700 font-semibold">
                      {item.confirmedAt ? new Date(item.confirmedAt).toLocaleTimeString() : "Pending"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          item.status === "CONFIRMED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : item.status === "FAILED"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {item.status === "CONFIRMED" && <Check className="h-3 w-3 text-emerald-600" />}
                        {item.status}
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
