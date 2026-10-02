import React, { useState, useEffect } from "react";
import { Users, History, Phone, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetch("/api/patients")
      .then((res) => res.json())
      .then((data) => setPatients(data || []))
      .catch((err) => console.error("Error fetching patients:", err))
      .finally(() => setLoading(false));
  }, []);

  const openHistoryModal = async (patient) => {
    setSelectedPatient(patient);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/patients/${patient._id}/history`);
      const data = await res.json();
      setHistory(data || []);
    } catch (err) {
      console.error("Error fetching patient history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Patient Directory & Audit Trails</h2>
            <p className="text-xs text-slate-500">Complete historical records for all patient reminders</p>
          </div>
        </div>
        <span className="text-xs font-mono text-slate-500">{patients.length} Total Patients</span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Patient Name</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    Loading patient directory from MongoDB...
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    No patient records stored in MongoDB yet.
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{p.fullName}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{p.phone}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openHistoryModal(p)}
                        className="px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-colors flex items-center gap-1 ml-auto shadow-sm"
                      >
                        <History className="h-3.5 w-3.5" />
                        <span>View History</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PATIENT HISTORY MODAL */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedPatient.fullName}</h3>
                <p className="text-xs font-mono text-slate-500">{selectedPatient.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                Close ✕
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Message Attempt Audit Log
              </h4>

              {historyLoading ? (
                <p className="text-xs text-slate-500 py-4 text-center">Loading attempt history...</p>
              ) : history.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No message attempts recorded for this patient.</p>
              ) : (
                history.map((att) => (
                  <div key={att._id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-700">Attempt #{att.attemptNumber}</span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {new Date(att.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-slate-800 font-mono text-[11px] bg-white p-2.5 rounded-lg border border-slate-200">
                      {att.message}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          att.status === "CONFIRMED" || att.status === "SENT"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {att.status}
                      </span>

                      {att.failureReason && (
                        <span className="text-rose-600 font-mono text-[10px]">{att.failureReason}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
