"use client";

import React, { useState } from "react";
import { Check, CheckCircle2, FileText, Filter, RotateCcw, Save } from "lucide-react";
import type { FormFieldSetting } from "@/types/schema";
import { DEFAULT_FORM_FIELD_SETTINGS } from "@/types/schema";

interface FormFieldsSettingsTabProps {
  settings: FormFieldSetting[];
  onSave: (updated: FormFieldSetting[]) => Promise<void>;
  saving: boolean;
  onResetToDefault: () => void;
}

const DOC_NAMES: Record<string, string> = {
  doc_1: "שאלון אישי רמה 5",
  doc_4: "הסכמה למסירת מידע פלילי",
  doc_9: "בקשה להנפקת כרטיס חכם",
};

export default function FormFieldsSettingsTab({
  settings,
  onSave,
  saving,
  onResetToDefault,
}: FormFieldsSettingsTabProps) {
  const [selectedDocFilter, setSelectedDocFilter] = useState<string>("all");
  const [localSettings, setLocalSettings] = useState<FormFieldSetting[]>(settings);
  const [searchTerm, setSearchTerm] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Sync if parent settings change
  React.useEffect(() => {
    setLocalSettings(settings);
    setHasChanges(false);
  }, [settings]);

  function handleToggleRequired(docTypeId: string, fieldKey: string) {
    setLocalSettings((prev) =>
      prev.map((item) => {
        if (item.doc_type_id === docTypeId && item.field_key === fieldKey) {
          return { ...item, is_required: !item.is_required };
        }
        return item;
      })
    );
    setHasChanges(true);
  }

  function handleToggleAll(required: boolean) {
    setLocalSettings((prev) =>
      prev.map((item) => {
        if (selectedDocFilter === "all" || item.doc_type_id === selectedDocFilter) {
          return { ...item, is_required: required };
        }
        return item;
      })
    );
    setHasChanges(true);
  }

  const filteredFields = localSettings.filter((item) => {
    if (selectedDocFilter !== "all" && item.doc_type_id !== selectedDocFilter) {
      return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchLabel = item.field_label.toLowerCase().includes(term);
      const matchKey = item.field_key.toLowerCase().includes(term);
      const matchSection = item.section.toLowerCase().includes(term);
      return matchLabel || matchKey || matchSection;
    }
    return true;
  });

  const requiredCount = localSettings.filter((f) => f.is_required).length;
  const optionalCount = localSettings.length - requiredCount;

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>הגדרת שדות חובה ורשות בטפסים דיגיטליים</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            סימון שדות כחובה ימנע מעבר המועמד/ת לתצוגה מקדימה ואישור ללא מילוי מלא של השדה.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onResetToDefault}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>איפוס לברירת מחדל</span>
          </button>

          <button
            type="button"
            onClick={() => onSave(localSettings)}
            disabled={saving || !hasChanges}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "שומר שינויים..." : "שמור הגדרות שדות"}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
          <div className="text-xs text-slate-500 font-medium">סה"כ שדות בטפסים</div>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{localSettings.length}</div>
        </div>
        <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl">
          <div className="text-xs text-rose-700 font-medium">שדות חובה מסומנים</div>
          <div className="text-xl font-bold text-rose-700 mt-0.5">{requiredCount}</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
          <div className="text-xs text-emerald-700 font-medium">שדות רשות</div>
          <div className="text-xl font-bold text-emerald-700 mt-0.5">{optionalCount}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl">
          <div className="text-xs text-blue-700 font-medium">סטטוס שמירה</div>
          <div className="text-xs font-bold text-blue-800 mt-1.5">
            {hasChanges ? "ישנם שינויים שלא נשמרו" : "מעודכן ושמור בגיליון"}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-600 shrink-0 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>סינון לפי טופס:</span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedDocFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedDocFilter === "all"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            כל הטפסים ({localSettings.length})
          </button>
          {["doc_1", "doc_4", "doc_9"].map((docId) => {
            const count = localSettings.filter((f) => f.doc_type_id === docId).length;
            return (
              <button
                key={docId}
                type="button"
                onClick={() => setSelectedDocFilter(docId)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedDocFilter === docId
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {DOC_NAMES[docId] || docId} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="חיפוש לפי שם שדה או חלק..."
            className="w-full sm:w-56 text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleToggleAll(true)}
              className="text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded"
              title="סמן את כל השדות המוצגים כחובה"
            >
              סמן הכל חובה
            </button>
            <button
              type="button"
              onClick={() => handleToggleAll(false)}
              className="text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2 py-1 rounded"
              title="סמן את כל השדות המוצגים כרשות"
            >
              סמן הכל רשות
            </button>
          </div>
        </div>
      </div>

      {/* Fields Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
            <tr>
              <th className="py-3 px-4 w-32">טופס</th>
              <th className="py-3 px-4 w-36">חלק בטופס</th>
              <th className="py-3 px-4">שם השדה למילוי</th>
              <th className="py-3 px-4 w-44 font-mono">מזהה שדה (Key)</th>
              <th className="py-3 px-4 w-36 text-center">האם שדה חובה?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {filteredFields.map((field) => {
              return (
                <tr
                  key={`${field.doc_type_id}_${field.field_key}`}
                  className="hover:bg-blue-50/40 transition cursor-pointer"
                  onClick={() => handleToggleRequired(field.doc_type_id, field.field_key)}
                >
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                      {DOC_NAMES[field.doc_type_id] || field.doc_type_id}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{field.section}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <span>{field.field_label}</span>
                      {field.is_required && (
                        <span className="text-rose-500 font-bold">*</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                    {field.field_key}
                  </td>
                  <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleToggleRequired(field.doc_type_id, field.field_key)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition ${
                        field.is_required
                          ? "bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200"
                          : "bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {field.is_required ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-rose-600" />
                          <span>חובה</span>
                        </>
                      ) : (
                        <span>רשות</span>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
