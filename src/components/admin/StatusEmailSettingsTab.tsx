"use client";

import React, { useState, useEffect } from "react";
import {
  Mail,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Paperclip,
  Eye,
  Sparkles,
  User,
  ChevronDown,
} from "lucide-react";
import type { StatusEmailTemplate } from "@/types/emailTemplates";
import { DEFAULT_STATUS_EMAIL_TEMPLATES } from "@/types/emailTemplates";
import type { AdminUser, SettingStage } from "@/types/schema";
import { interpolateEmailTemplate } from "@/lib/email/emailTemplateEngine";

interface StatusEmailSettingsTabProps {
  admins: AdminUser[];
  stages: SettingStage[];
}

export default function StatusEmailSettingsTab({
  admins,
  stages,
}: StatusEmailSettingsTabProps) {
  const [templates, setTemplates] = useState<Record<string, StatusEmailTemplate>>(
    DEFAULT_STATUS_EMAIL_TEMPLATES
  );
  const [activeStageId, setActiveStageId] = useState<string>("stage_1");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Load templates from API
  useEffect(() => {
    async function loadTemplates() {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/settings/email-templates");
        if (res.ok) {
          const json = await res.json();
          if (json.data && typeof json.data === "object") {
            setTemplates((prev) => ({ ...prev, ...json.data }));
          }
        }
      } catch (err) {
        console.warn("Could not load email templates:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTemplates();
  }, []);

  // Current active template
  const currentTemplate =
    templates[activeStageId] ||
    DEFAULT_STATUS_EMAIL_TEMPLATES[activeStageId] || {
      stage_id: activeStageId,
      stage_name: activeStageId,
      enabled: true,
      recipient_email: "hr@demo.co.il",
      attach_pdfs: activeStageId === "stage_1",
      subject: "עדכון סטאטוס קליטה - {שם_מועמד} - {שם_פרויקט}",
      body: "שלום רב,\n\nהרינו לעדכן על שינוי סטאטוס בתיק הקליטה של {שם_מועמד}.\n\nבברכה,\nמערכת Onboarding Checklist",
    };

  function updateCurrentTemplate(patch: Partial<StatusEmailTemplate>) {
    setTemplates((prev) => ({
      ...prev,
      [activeStageId]: {
        ...currentTemplate,
        ...patch,
      },
    }));
  }

  function handleResetToRecommended() {
    const recommended = DEFAULT_STATUS_EMAIL_TEMPLATES[activeStageId];
    if (recommended) {
      updateCurrentTemplate(recommended);
      setStatusMessage({
        type: "success",
        text: "הנוסח שוחזר בהצלחה לנוסח המומלץ והרשמי של הסטאטוס",
      });
    }
  }

  function handleInsertPlaceholder(tag: string, targetField: "subject" | "body") {
    if (targetField === "subject") {
      updateCurrentTemplate({ subject: `${currentTemplate.subject} ${tag}` });
    } else {
      updateCurrentTemplate({ body: `${currentTemplate.body} ${tag}` });
    }
  }

  async function handleSaveAll() {
    try {
      setSaving(true);
      setStatusMessage(null);
      const res = await fetch("/api/admin/settings/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templates }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "שגיאה בשמירת התבניות");
      }
      setStatusMessage({
        type: "success",
        text: "כל תבניות המייל לסטאטוסים נשמרו בהצלחה במערכת",
      });
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err?.message || "שגיאה בשמירת תבניות המייל",
      });
    } finally {
      setSaving(false);
    }
  }

  // Sample data for live preview
  const sampleVars = {
    candidate_name: "ישראל ישראלי",
    id_number: "012345678",
    project_name: "פרויקט ענן",
    vendor_name: 'מטריקס טכנולוגיות בע"מ',
    completion_date: "27/09/2026 15:30",
    forms_count: 11,
    drive_url: "https://drive.google.com/drive/folders/sample_folder_id",
  };

  const previewSubject = interpolateEmailTemplate(currentTemplate.subject, sampleVars);
  const previewBody = interpolateEmailTemplate(currentTemplate.body, sampleVars);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <span>הגדרת גוף ונושא הודעות מייל לפי סטאטוס</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            הגדר עבור כל שלב בתהליך את נוסח המייל, הנמען, והאם לצרף את כל טפסי ה-PDF החתומים כ-Attachment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetToRecommended}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            title="שחזר נוסח מומלץ עבור הסטאטוס הנבחר"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>שחזר נוסח מומלץ</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "שומר..." : "שמור תבניות מייל"}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-xs ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Status Selector Dropdown */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
        <label className="block text-xs font-bold text-slate-700">
          בחר סטאטוס / שלב לעריכה:
        </label>
        <div className="relative max-w-lg">
          <select
            value={activeStageId}
            onChange={(e) => {
              setActiveStageId(e.target.value);
              setStatusMessage(null);
            }}
            className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl px-4 py-2.5 pl-10 text-xs sm:text-sm font-bold text-slate-800 transition cursor-pointer"
          >
            {stages && stages.length > 0 ? (
              stages.map((st) => (
                <option key={st.stage_id} value={st.stage_id}>
                  שלב {st.stage_order}: {st.stage_name}
                  {st.stage_id === "stage_1" ? " (סיום מילוי טפסים וצירוף PDF)" : ""}
                </option>
              ))
            ) : (
              Object.values(DEFAULT_STATUS_EMAIL_TEMPLATES).map((t) => (
                <option key={t.stage_id} value={t.stage_id}>
                  {t.stage_name}
                </option>
              ))
            )}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Editor Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form Fields */}
        <div className="lg:col-span-2 space-y-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          {/* Status Configuration Options */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
              <input
                type="checkbox"
                checked={currentTemplate.enabled}
                onChange={(e) => updateCurrentTemplate({ enabled: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>הפעל שליחת מייל במעבר לסטאטוס זה</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
              <input
                type="checkbox"
                checked={currentTemplate.attach_pdfs}
                onChange={(e) => updateCurrentTemplate({ attach_pdfs: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="flex items-center gap-1.5 text-blue-800">
                <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                <span>צרף את כל טפסי ה-PDF החתומים כ-Attachment</span>
              </span>
            </label>
          </div>

          {/* Recipient Email Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              כתובת מייל של הנמען / אחראי הסטאטוס:
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="email"
                value={currentTemplate.recipient_email}
                onChange={(e) => updateCurrentTemplate({ recipient_email: e.target.value })}
                placeholder="למשל: hr@demo.co.il"
                className="flex-1 text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium"
              />
              {admins && admins.length > 0 && (
                <div className="relative">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        updateCurrentTemplate({ recipient_email: e.target.value });
                      }
                    }}
                    value=""
                    className="w-full sm:w-auto appearance-none text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl px-3 py-2 pl-7 font-semibold text-slate-700 cursor-pointer"
                  >
                    <option value="">בחר מרשימת מנהלים / HR...</option>
                    {admins.map((adm) => (
                      <option key={adm.email} value={adm.email}>
                        {adm.full_name} ({adm.role}) - {adm.email}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              בסיום המילוי, הודעת הדואר תישלח לנמען זה, כאשר המייל של המשתמש שסיים ישמש ככתובת השולח / Reply-To.
            </p>
          </div>

          {/* Subject Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">נושא המייל (Subject):</label>
            </div>
            <input
              type="text"
              value={currentTemplate.subject}
              onChange={(e) => updateCurrentTemplate({ subject: e.target.value })}
              placeholder="נושא המייל..."
              className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3 py-2.5 bg-white focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          {/* Dynamic Placeholders Toolbar */}
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-1.5">
            <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>לחץ להוספת תגית דינמית לגוף המייל:</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { tag: "{שם_מועמד}", label: "שם מועמד" },
                { tag: "{תעודת_זהות}", label: "ת.ז" },
                { tag: "{שם_פרויקט}", label: "פרויקט" },
                { tag: "{שם_ספק}", label: "ספק" },
                { tag: "{תאריך_סיום}", label: "תאריך סיום" },
                { tag: "{מספר_טפסים}", label: "מספר טפסים" },
                { tag: "{רשימת_טפסים}", label: "רשימת 11 הטפסים" },
                { tag: "{קישור_דרייב}", label: "קישור לתיקיית דרייב" },
              ].map((item) => (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => handleInsertPlaceholder(item.tag, "body")}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-white hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg transition shadow-xs"
                >
                  +{item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Body Textarea */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              גוף המייל (Body Text):
            </label>
            <textarea
              rows={12}
              value={currentTemplate.body}
              onChange={(e) => updateCurrentTemplate({ body: e.target.value })}
              placeholder="כתוב כאן את תוכן המייל..."
              className="w-full text-xs leading-relaxed border border-slate-300 rounded-xl p-3.5 bg-white focus:ring-2 focus:ring-blue-500 font-sans text-slate-800 whitespace-pre-wrap"
            />
          </div>
        </div>

        {/* Right 1 Col: Live Preview */}
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-blue-600" />
                <span>תצוגה מקדימה חיה (Preview)</span>
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                נתוני דוגמה
              </span>
            </div>

            {/* Simulated Email Envelope */}
            <div className="space-y-2 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                <div className="text-[11px] text-slate-500">
                  <strong className="text-slate-700">אל:</strong> {currentTemplate.recipient_email || "hr@demo.co.il"}
                </div>
                <div className="text-[11px] text-slate-500">
                  <strong className="text-slate-700">שולח / Reply-To:</strong> israel.israeli@example.com
                </div>
                <div className="text-[11px] text-slate-800 font-bold pt-1 border-t border-slate-200">
                  <strong className="text-slate-600 font-normal">נושא: </strong>
                  {previewSubject}
                </div>
              </div>

              {/* Attachments Indicator */}
              {currentTemplate.attach_pdfs && (
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-2">
                  <Paperclip className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>
                    <strong>11 קובצי PDF חתומים</strong> יצורפו אוטומטית כ-Attachments למייל זה.
                  </span>
                </div>
              )}

              {/* Body Content */}
              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 max-h-80 overflow-y-auto font-sans text-slate-800 whitespace-pre-wrap leading-relaxed text-xs">
                {previewBody}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
