"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  FileEdit,
  ExternalLink,
  Shield,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  getFullDocumentInfo,
  saveCustomTemplate,
  resetTemplateToDefault,
  type FullDocumentInfo,
} from "@/lib/forms/declarationsFullText";

interface FormEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  docTypeId: string;
  onSaved?: () => void;
}

export default function FormEditorModal({
  isOpen,
  onClose,
  docTypeId,
  onSaved,
}: FormEditorModalProps) {
  const [docInfo, setDocInfo] = useState<FullDocumentInfo | null>(null);
  const [clauses, setClauses] = useState<string[]>([]);
  const [newClause, setNewClause] = useState("");
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && docTypeId) {
      const current = getFullDocumentInfo(docTypeId);
      setDocInfo(current);
      setClauses([...current.fullContent]);
      setStatusMessage(null);
    }
  }, [isOpen, docTypeId]);

  if (!isOpen || !docInfo) return null;

  function handleAddClause() {
    if (!newClause.trim()) return;
    setClauses([...clauses, newClause.trim()]);
    setNewClause("");
  }

  function handleClauseChange(index: number, val: string) {
    const updated = [...clauses];
    updated[index] = val;
    setClauses(updated);
  }

  function handleDeleteClause(index: number) {
    const updated = clauses.filter((_, i) => i !== index);
    setClauses(updated);
  }

  function handleSave() {
    if (!docInfo) return;
    try {
      saveCustomTemplate(docTypeId, {
        name: docInfo.name,
        shortDesc: docInfo.shortDesc,
        lawReference: docInfo.lawReference,
        version: docInfo.version,
        fullContent: clauses.filter((c) => c.trim().length > 0),
      });

      setStatusMessage({
        type: "success",
        text: "תבנית הטופס עודכנה ונשמרה בהצלחה במערכת!",
      });

      if (onSaved) onSaved();

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch {
      setStatusMessage({
        type: "error",
        text: "שגיאה בשמירת תבנית הטופס",
      });
    }
  }

  function handleReset() {
    if (confirm("האם לאפס את תבנית הטופס לנוסח המערכת המקורי?")) {
      resetTemplateToDefault(docTypeId);
      const original = getFullDocumentInfo(docTypeId);
      setDocInfo(original);
      setClauses([...original.fullContent]);
      setStatusMessage({
        type: "success",
        text: "התבנית אופסה לנוסח ברירת המחדל המקורי",
      });
      if (onSaved) onSaved();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                עריכה והחלפת תבנית טופס: {docInfo.name}
              </h2>
              <p className="text-xs text-slate-500 font-mono">מזהה: {docTypeId}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alert */}
        {statusMessage && (
          <div
            className={`px-6 py-3 flex items-center gap-2 text-xs font-semibold ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-b border-emerald-200"
                : "bg-rose-50 text-rose-800 border-b border-rose-200"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Body content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Metadata Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                כותרת / שם הטופס:
              </label>
              <input
                type="text"
                value={docInfo.name}
                onChange={(e) => setDocInfo({ ...docInfo, name: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                גרסת תבנית:
              </label>
              <input
                type="text"
                value={docInfo.version || "1.0"}
                onChange={(e) => setDocInfo({ ...docInfo, version: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                תיאור מקוצר / כותרת משנה:
              </label>
              <input
                type="text"
                value={docInfo.shortDesc}
                onChange={(e) => setDocInfo({ ...docInfo, shortDesc: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                בסיס משפטי / הפניה לחוק רלוונטי:
              </label>
              <input
                type="text"
                value={docInfo.lawReference || ""}
                onChange={(e) => setDocInfo({ ...docInfo, lawReference: e.target.value })}
                placeholder={'לדוגמה: חוק הגנת הפרטיות, התשמ"א-1981'}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Legal Clauses List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-900">
                סעיפי הנוסח המשפטי והביטחוני של הטופס ({clauses.length} סעיפים):
              </label>
              <span className="text-[11px] text-slate-400">
                ניתן לערוך כל סעיף, למחוק או להוסיף סעיפים חדשים
              </span>
            </div>

            <div className="space-y-3">
              {clauses.map((clause, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3"
                >
                  <span className="text-xs font-bold text-slate-400 pt-2 w-6 text-center">
                    {idx + 1}.
                  </span>
                  <textarea
                    rows={2}
                    value={clause}
                    onChange={(e) => handleClauseChange(idx, e.target.value)}
                    className="flex-1 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg p-2.5 leading-relaxed focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteClause(idx)}
                    title="מחק סעיף"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Clause */}
            <div className="pt-2 flex items-center gap-2">
              <input
                type="text"
                value={newClause}
                onChange={(e) => setNewClause(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddClause();
                  }
                }}
                placeholder="הוסף סעיף חדש לתבנית הטופס..."
                className="flex-1 text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleAddClause}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition"
              >
                <Plus className="w-4 h-4" />
                <span>הוסף סעיף</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>איפוס לברירת מחדל</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              ביטול
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>שמור תבנית מעודכנת</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
