import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Users,
  PlayCircle,
  History,
  RefreshCw,
  CheckCircle2,
  Settings
} from "lucide-react";

export default function Sidebar() {
  const navItems = [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Appointments", path: "/appointments", icon: Calendar },
    { label: "Patients", path: "/patients", icon: Users },
    { label: "Live Automation", path: "/automation", icon: PlayCircle },
    { label: "Run History", path: "/history", icon: History },
    { label: "Confirmations", path: "/confirmations", icon: CheckCircle2 },
    { label: "Failed / Retry", path: "/failed", icon: RefreshCw },
    { label: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shadow-sm">
      <nav className="space-y-1.5">
        <div className="px-3 py-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
          Main Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
        <p className="font-bold text-slate-800">Weave Automation v2.0</p>
        <p className="text-[10px] text-slate-500">MongoDB Source of Truth</p>
      </div>
    </aside>
  );
}
