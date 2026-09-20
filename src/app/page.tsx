import Link from "next/link";
import {
  CheckCircle2,
  ShieldCheck,
  Building2,
  ArrowLeft,
  UploadCloud,
  Shield,
  CreditCard,
  Archive,
} from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen p-6 md:p-12 max-w-6xl mx-auto">
      <header className="mb-10 pb-6 border-b border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              מערכת ניהול Onboarding
            </h1>
            <p className="text-slate-600 mt-1">
              בקרת תהליכי קליטה, מסמכים והנפקת כרטיסים חכמים מול ספקים ומשאבי אנוש
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/login?portal=admin"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-lg shadow-slate-900/20 transition-all"
            >
              <Shield className="w-4 h-4 text-amber-400" />
              <span>כניסת HR / Admin</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/login?portal=vendor"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all"
            >
              <Building2 className="w-4 h-4" />
              <span>כניסת ספקים</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/login?tab=register"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
            >
              <span>הרשמת ספק חדש</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-slate-900 text-blue-400 flex items-center justify-center mb-4">
            <Shield className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            פורטל ניהול ו-HR
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            דשבורד KPI, מעבר שלבים, אימות צק ליסט ואישור הנפקת כרטיס חכם.
          </p>
          <div className="text-xs text-slate-500 bg-slate-50 rounded p-2 border border-slate-100 font-mono">
            /admin & /admin/completed
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <Building2 className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            פורטל ספקים מאובטח
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            אימות JWT מבוסס HttpOnly והפרדת נתונים מוחלטת (Multi-Tenant).
          </p>
          <div className="text-xs text-slate-500 bg-slate-50 rounded p-2 border border-slate-100 font-mono">
            /vendor & /login
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <UploadCloud className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            מנוע מסמכים ו-Drive
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            שמות קבצים תקניים, דריסת גרסאות ב-Drive, צק ליסט 9 מסמכים ובדיקת תקינות.
          </p>
          <div className="text-xs text-slate-500 bg-slate-50 rounded p-2 border border-slate-100 font-mono">
            /api/documents/upload
          </div>
        </div>
      </div>

      <section className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-blue-600" />
          יכולות מערכת מלאות (Sprint 1, 2 & 3)
        </h3>
        <ul className="space-y-3 text-slate-700 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 font-bold">✓</span>
            <span>
              <strong>דשבורד HR ו-Admin:</strong> 4 כרטיסיות מדדי KPI, סינון לפי ספק, פרויקט ושלב, וטבלת מועמדים פעילים עם יחסי מסמכים (כגון 5/9).
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 font-bold">✓</span>
            <span>
              <strong>אישור מעבר שלבים ובקרה:</strong> בורר שלבים מקושר ל-<code>SettingStages</code> שמעדכן בזמן אמת ב-Google Sheets ומתעד ב-Audit Log.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 font-bold">✓</span>
            <span>
              <strong>אישור הנפקת כרטיס חכם:</strong> בדיקת שלמות מחמירה של כל 9 מסמכי החובה, העברת המועמד לסטטוס מושלם והעברה לארכיון.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 font-bold">✓</span>
            <span>
              <strong>ארכיון הושלמו לביקורת וציות:</strong> טבלת ארכיון ייעודית עם מועדי סיום וקישורים קבועים לתיקיות Drive עבור ביקורת.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 font-bold">✓</span>
            <span>
              <strong>הפרדת הרשאות (RBAC):</strong> הגנה ב-Middleware על נתיבי ספקים ו-HR/Admin עם עוגיות HttpOnly מאובטחות.
            </span>
          </li>
        </ul>
      </section>
    </main>
  );
}
