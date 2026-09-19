"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Filter,
  Calendar,
  User,
  ShieldCheck,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Clock,
} from "lucide-react";
import type { AuditLogEntry } from "@/types/schema";

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [actorEmailFilter, setActorEmailFilter] = useState("");
  const [candidateIdFilter, setCandidateIdFilter] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("from_date", fromDate);
      if (toDate) params.set("to_date", toDate);
      if (actionFilter) params.set("action", actionFilter);
      if (actorEmailFilter) params.set("actor_email", actorEmailFilter);
      if (candidateIdFilter) params.set("candidate_id", candidateIdFilter);

      const res = await fetch(`/api/admin/audit-log?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setLogs(json.data || []);
      } else {
        setMessage({ type: "error", text: json.message || "שגיאה בטעינת יומן פעולות" });
      }
    } catch {
      setMessage({ type: "error", text: "שגיאת תקשורת בטעינת יומן פעולות" });
    } finally {
      setLoading(false);
    }
  }

  function handleResetFilters() {
    setFromDate("");
    setToDate("");
    setActionFilter("");
    setActorEmailFilter("");
    setCandidateIdFilter("");
  }

  function formatActionLabel(action: string) {
    switch (action) {
      case "UPLOAD_DOCUMENT":
        return { label: "העלאת מסמך", color: "bg-blue-50 text-blue-700 border-blue-200" };
      case "VERIFY_DOCUMENT":
        return { label: "אימות מסמך", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "REJECT_DOCUMENT":
        return { label: "דחיית מסמך", color: "bg-rose-50 text-rose-700 border-rose-200" };
      case "UPDATE_STAGE":
        return { label: "עדכון שלב", color: "bg-amber-50 text-amber-700 border-amber-200" };
      case "COMPLETE_ONBOARDING":
        return { label: "סיום קליטה", color: "bg-purple-50 text-purple-700 border-purple-200" };
      case "UPDATE_STAGES_SETTINGS":
        return { label: "עדכון שלבי תהליך", color: "bg-indigo-50 text-indigo-700 border-indigo-200" };
      case "UPDATE_DOCUMENTS_SETTINGS":
        return { label: "עדכון טפסים ותבניות", color: "bg-teal-50 text-teal-700 border-teal-200" };
      case "UPSERT_VENDOR_SETTINGS":
        return { label: "עדכון ספק", color: "bg-sky-50 text-sky-700 border-sky-200" };
      case "UPDATE_PROJECTS_SETTINGS":
        return { label: "עדכון פרויקטים", color: "bg-cyan-50 text-cyan-700 border-cyan-200" };
      default:
        return { label: action, color: "bg-slate-50 text-slate-700 border-slate-200" };
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">יומן פעולות וביקורת מערכת (Audit Trail)</h1>
            <p className="text-sm text-slate-500">
              תיעוד היסטורי מפורט של כל שינוי סטטוס, אימות מסמך, סיום קליטה ושינויי הגדרות
            </p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>רענון יומן</span>
        </button>
      </div>

      {/* Notification Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>סינון רשומות ביקורת</span>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
          >
            איפוס שדות סינון
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              מתאריך
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              עד תאריך
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              סוג פעולה
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">כל הפעולות</option>
              <option value="UPLOAD_DOCUMENT">העלאת מסמך</option>
              <option value="VERIFY_DOCUMENT">אימות מסמך</option>
              <option value="REJECT_DOCUMENT">דחיית מסמך</option>
              <option value="UPDATE_STAGE">עדכון שלב</option>
              <option value="COMPLETE_ONBOARDING">סיום קליטה</option>
              <option value="UPDATE_STAGES_SETTINGS">עדכון שלבי תהליך</option>
              <option value="UPDATE_DOCUMENTS_SETTINGS">עדכון טפסים ותבניות</option>
              <option value="UPSERT_VENDOR_SETTINGS">עדכון ספק</option>
              <option value="UPDATE_PROJECTS_SETTINGS">עדכון פרויקטים</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              מבצע הפעולה (אימייל)
            </label>
            <input
              type="text"
              value={actorEmailFilter}
              onChange={(e) => setActorEmailFilter(e.target.value)}
              placeholder="חיפוש לפי אימייל..."
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              מזהה מועמד / מקור
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={candidateIdFilter}
                onChange={(e) => setCandidateIdFilter(e.target.value)}
                placeholder="ID מועמד..."
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={fetchLogs}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                title="החל סינון"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700">
              סה&quot;כ רשומות ביקורת שנמצאו: {logs.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
            <span className="text-sm">טוען נתוני ביקורת מגיליון AuditLogs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">לא נמצאו רשומות ביקורת תואמות לחתך הסינון</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                  <th className="py-3 px-4 font-semibold">זמן אירוע (Timestamp)</th>
                  <th className="py-3 px-4 font-semibold">סוג פעולה</th>
                  <th className="py-3 px-4 font-semibold">ישות ויעד</th>
                  <th className="py-3 px-4 font-semibold">מבצע הפעולה</th>
                  <th className="py-3 px-4 font-semibold">פרטי פעולה והערות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log, idx) => {
                  const actionStyle = formatActionLabel(log.action_type);
                  const dateStr = log.timestamp
                    ? new Date(log.timestamp).toLocaleString("he-IL", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "-";

                  return (
                    <tr key={idx} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${actionStyle.color}`}
                        >
                          {actionStyle.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-[11px] font-semibold text-slate-700 block">
                          {log.entity_type}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {log.entity_id}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-slate-700 block text-xs">
                          {log.actor_email}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          תפקיד: {log.actor_role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-md">
                        {log.details}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
