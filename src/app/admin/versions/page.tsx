import { Metadata } from "next";
import {
  CheckCircle2,
  Shield,
  Building2,
  UploadCloud,
  Layers,
  History,
  FolderGit2,
  Lock,
  Smartphone,
  FileSignature,
} from "lucide-react";

export const metadata: Metadata = {
  title: "גרסאות מערכת ויכולות | Onboarding Checklist System",
  description: "תיעוד גרסאות, יכולות המערכת ומפרט טכני של מערכת Onboarding",
};

export default function VersionsPage() {
  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-8" dir="rtl">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              יומן גרסאות ויכולות מערכת
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              סקירת ארכיטקטורה, מפרט ספרינטים ויכולות מערכת Onboarding Checklist
            </p>
          </div>
        </div>
      </div>

      {/* 3 Main Architectural Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-blue-400 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            פורטל ניהול ומשאבי אנוש
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            דשבורד KPI חי, בקרת שלבי קליטה, אימות 9 מסמכי חובה, יומן ביקורת (Audit Log),
            וניהול הגדרות ספקים, פרויקטים ושלבים.
          </p>
          <div className="text-[11px] text-slate-500 bg-slate-50 rounded-lg p-2 border border-slate-100 font-mono">
            /admin & /admin/completed & /admin/settings
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            פורטל ספקים מאובטח
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            אימות JWT מבוסס HttpOnly והפרדת נתונים מוחלטת (Multi-Tenant).
            קליטת מועמדים, מעקב צ'קליסט, והרשמת ספק עצמאית.
          </p>
          <div className="text-[11px] text-slate-500 bg-slate-50 rounded-lg p-2 border border-slate-100 font-mono">
            /vendor & /vendor/candidate/[id]
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Smartphone className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            פורטל מועמדים דיגיטלי למובייל
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            כניסה מאובטחת באמצעות קישור ייחודי (Token Guard), אימות ת.ז. ישראלית (Luhn),
            9 טפסים דיגיטליים מקוונים וחתימה אלקטרונית ב-Canvas.
          </p>
          <div className="text-[11px] text-slate-500 bg-slate-50 rounded-lg p-2 border border-slate-100 font-mono">
            /portal/[token] & /api/portal/submit
          </div>
        </div>
      </div>

      {/* Sprints Capabilities Detailed Checklist */}
      <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
          <Layers className="w-5 h-5 text-blue-600" />
          <span>פירוט גרסאות ויכולות (Sprints 1 - 5)</span>
        </h2>

        <div className="space-y-4 text-xs sm:text-sm text-slate-700">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs">5</span>
              <span>Sprint 5 (Phase 2): פורטל מועמדים דיגיטלי למובייל וטפסים מקוונים</span>
            </div>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pr-2">
              <li>נתיב מאובטח עם אימות טוקן ותאריך תפוגה: <code>/portal/[token]</code>.</li>
              <li>בדיקת תקינות תעודת זהות ישראלית (Luhn Checksum) בזמן אמת עם ריפוד אפסים ל-9 ספרות.</li>
              <li>אקורדיון 9 מסמכי החובה כולל חלונות מודאליים לצפייה בנוסח המשפטי המלא.</li>
              <li>רכיב חתימה דיגיטלית ב-Canvas התומך במגע (Touch) ובעכבר.</li>
              <li>הפקה אוטומטית של קובצי PDF והעלאתם ישירות לתיקיית המועמד ב-Google Drive.</li>
            </ul>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs">4</span>
              <span>Sprint 4: הגדרות מערכת מתקדמות ויומן ביקורת (Audit Trail)</span>
            </div>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pr-2">
              <li>מסך הגדרות מערכת ב-4 לשוניות: שלבי תהליך, קטלוג מסמכים, ניהול ספקים ופרויקטים.</li>
              <li>יומן פעולות מאובטח (Audit Log) לקריאה בלבד עם סינון תאריכים ותפקידים.</li>
              <li>אכיפת הרשאות מחמירה (RBAC) ב-Middleware ומניעת גישה ממשתמשים שאינם אדמין.</li>
            </ul>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="w-6 h-6 rounded-lg bg-slate-700 text-white flex items-center justify-center text-xs">3</span>
              <span>Sprint 3: פורטל ספקים והפרדת שוכרים (Multi-Tenant)</span>
            </div>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pr-2">
              <li>בידוד נתונים מוחלט המונע מספק לצפות במועמדים של ספק אחר.</li>
              <li>העלאת קבצים עם אימות PDF Magic Bytes (חתימת %PDF-).</li>
              <li>מבנה שמות קבצים תקני אחיד: <code>[שם המסמך].[שם המועמד].[פרויקט].[ספק].pdf</code>.</li>
            </ul>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="w-6 h-6 rounded-lg bg-slate-700 text-white flex items-center justify-center text-xs">2</span>
              <span>Sprint 2: דשבורד HR ובקרת הנפקת כרטיסים חכמים</span>
            </div>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pr-2">
              <li>4 כרטיסיות KPI לניהול סטטוסים ומעקב בזמן אמת.</li>
              <li>מנגנון מעבר שלבים ובדיקת שלמות 9 מסמכי חובה לפני אישור הנפקת כרטיס.</li>
              <li>ארכיון הושלמו עם קישורים קבועים לתיקיות ב-Google Drive.</li>
            </ul>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="w-6 h-6 rounded-lg bg-slate-700 text-white flex items-center justify-center text-xs">1</span>
              <span>Sprint 1: תשתית אינטגרציה מלאה ל-Google Cloud</span>
            </div>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pr-2">
              <li>חיבור מבוסס Service Account ל-Google Sheets API ו-Google Drive API.</li>
              <li>מבנה 8 גיליונות נתונים מנוהלים ומאובטחים.</li>
              <li>אימות כניסת Google OAuth 2.0.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
