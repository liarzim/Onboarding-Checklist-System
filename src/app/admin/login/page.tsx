"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Mail, KeyRound, Loader2, ArrowLeft, UserCheck, ShieldAlert } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"HR" | "Admin">("HR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(customEmail?: string, customRole?: "HR" | "Admin") {
    setError(null);
    setLoading(true);

    const targetEmail = customEmail || email;
    const targetRole = customRole || role;

    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          role: targetRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "שגיאה בפרטי ההתחברות");
      }

      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בביצוע ההתחברות");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl p-8 text-white">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold">
            פורטל ניהול ומשאבי אנוש
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            בקרת קליטת מועמדים, מעקב סטטוסים ואישור הנפקת כרטיסים חכמים
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-sm flex items-start gap-3">
            <span className="font-bold">✕</span>
            <span>{error}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              כתובת אימייל מורשית
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hr@organization.gov.il"
                className="w-full pr-11 pl-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              תפקיד במערכת
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("HR")}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-2 ${
                  role === "HR"
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-slate-900/60 border-slate-700 text-slate-400 hover:text-white"
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>משאבי אנוש (HR)</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("Admin")}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-2 ${
                  role === "Admin"
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-slate-900/60 border-slate-700 text-slate-400 hover:text-white"
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>מנהל מערכת (Admin)</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>מתחבר...</span>
              </>
            ) : (
              <>
                <span>כניסה למערכת הניהול</span>
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-slate-800 px-3 text-slate-400">כניסה מהירה להדגמה</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleLogin("hr@example.com", "HR")}
            disabled={loading}
            className="py-2.5 px-3 bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-600"
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>התחבר כ-HR</span>
          </button>

          <button
            type="button"
            onClick={() => handleLogin("admin@example.com", "Admin")}
            disabled={loading}
            className="py-2.5 px-3 bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-600"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>התחבר כ-Admin</span>
          </button>
        </div>
      </div>
    </div>
  );
}
