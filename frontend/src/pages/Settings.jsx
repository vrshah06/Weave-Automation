import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, Save, CheckCircle2, AlertTriangle, FileText } from "lucide-react";

export default function Settings() {
  const [settings, setSettings] = useState({
    name: "Default Medical Clinic",
    messageTemplate: "Hi {{patient_name}}, this is a reminder for your appointment on {{appointment_date}} at {{appointment_time}}.",
    timeZone: "America/New_York"
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setSettings({
            name: data.name || "Default Medical Clinic",
            messageTemplate: data.messageTemplate || "",
            timeZone: data.timeZone || "America/New_York"
          });
        }
      })
      .catch((err) => console.error("Error fetching settings:", err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Settings and message template saved to MongoDB successfully!" });
      } else {
        setMessage({ type: "error", text: "Failed to save settings." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error saving settings." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
            <SettingsIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Customer Self-Service Settings</h2>
            <p className="text-xs text-slate-500">Customize clinic info and reminder message templates</p>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border shadow-sm ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="font-bold">Dismiss</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
            Clinic / Organization Name
          </label>
          <input
            type="text"
            value={settings.name}
            onChange={(e) => setSettings({ ...settings, name: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
            Time Zone
          </label>
          <select
            value={settings.timeZone}
            onChange={(e) => setSettings({ ...settings, timeZone: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
          >
            <option value="America/New_York">Eastern Time (US & Canada)</option>
            <option value="America/Chicago">Central Time (US & Canada)</option>
            <option value="America/Denver">Mountain Time (US & Canada)</option>
            <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
            Reminder Message Template
          </label>
          <textarea
            rows={4}
            value={settings.messageTemplate}
            onChange={(e) => setSettings({ ...settings, messageTemplate: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono text-blue-800 focus:outline-none focus:border-blue-500 focus:bg-white leading-relaxed transition-all shadow-sm"
            required
          />
          <p className="text-[11px] text-slate-500 mt-2">
            Available Placeholders: <code className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">{"{{patient_name}}"}</code>,{" "}
            <code className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">{"{{appointment_date}}"}</code>,{" "}
            <code className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">{"{{appointment_time}}"}</code>
          </p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md shadow-blue-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Saving..." : "Save Settings to MongoDB"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
