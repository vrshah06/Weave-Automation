import React from "react";
import { Zap, ShieldCheck } from "lucide-react";

export default function Navbar({ status, mode }) {
  const getBadgeStyle = () => {
    switch (status) {
      case "starting":
        return "bg-amber-50 text-amber-700 border-amber-300";
      case "logging_in":
        return "bg-blue-50 text-blue-700 border-blue-300";
      case "running":
        return "bg-emerald-50 text-emerald-700 border-emerald-300";
      case "completed":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "failed":
        return "bg-rose-50 text-rose-700 border-rose-300";
      case "stopped":
        return "bg-slate-100 text-slate-700 border-slate-300";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 px-6 py-3.5 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Weave Appointment Reminders
            </h1>
            <p className="text-xs text-slate-500">Self-Service Automation Hub • Default Medical Clinic</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-2 ${getBadgeStyle()}`}>
            <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
            <span className="capitalize">{status || "Ready"}</span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
            <span>Mode: <strong className={mode === "send" ? "text-rose-600" : "text-blue-600"}>{mode === "send" ? "LIVE SEND" : "DRY RUN"}</strong></span>
          </div>
        </div>
      </div>
    </header>
  );
}
