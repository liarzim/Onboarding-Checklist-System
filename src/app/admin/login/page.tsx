"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Mail,
  KeyRound,
  Loader2,
  ArrowLeft,
  UserCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  Lock,
  CheckCircle2,
} from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"HR" | "Admin">("HR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forced First-time Password Change State
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("error");
      if (err) {
        setError(decodeURIComponent(err));
      }
    }
  }, []);

  async function handleLogin(customEmail?: string, customRole?: "HR" | "Admin", customPassword?: string) {
    setError(null);
    setLoading(true);

    const targetEmail = customEmail || email;
    const targetRole = customRole || role;
    const targetPassword = customPassword !== undefined ? customPassword : password;

    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          password: targetPassword || undefined,
          role: targetRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "שגיאה בפרטי ההתחברות");
      }

      if (data.requirePasswordChange) {
        setEmail(targetEmail);
        setCurrentPassword(targetPassword);
        setRequirePasswordChange(true);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בביצוע ההתחברות");
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangeError(null);

    if (newPassword.length < 6) {
      setChangeError("הסיסמה החדשה חייבת להכיל לפחות 6 תווים");
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangeError("אימות הסיסמה אינו תואם לסיסמה החדשה");
      return;
    }

    setChangeLoading(true);
    try {
      const res = await fetch("/api/auth/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "שגיאה בעדכון הסיסמה");
      }

      router.push("/admin");
      router.refresh();
    } catch (err) {
      setChangeError(err instanceof Error ? err.message : "שגיאה בעדכון הסיסמה");
    } finally {
      setChangeLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl p-8 text-white">
        
        {/* Header */}
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

        {/* Global Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-sm flex items-start gap-3">
            <span className="font-bold">✕</span>
            <span>{error}</span>
          </div>
        )}

        {/* VIEW 1: FIRST-TIME PASSWORD CHANGE MODAL */}
        {requirePasswordChange ? (
          <div className="space-y-5">
            <div className="p-4 bg-amber-950/50 border border-amber-800/80 rounded-xl text-amber-200 text-xs">
              <div className="font-bold flex items-center gap-1.5 text-sm mb-1 text-amber-300">
                <KeyRound className="w-4 h-4" />
                <span>החלפת סיסמה ראשונית</span>
              </div>
              <p>
                התחברת באמצעות סיסמה ראשונית זמנית. למען אבטחת החשבון, חובה לקבוע כעת סיסמה אישית וקבועה.
              </p>
            </div>

            {changeError && (
              <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                <span className="font-bold">✕</span>
                <span>{changeError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  כתובת אימייל
                </label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-400 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  סיסמה ראשונית (נוכחית)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="הזן את הסיסמה הראשונית שנמסרה לך"
                    className="w-full pr-10 pl-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  סיסמה אישית חדשה (לפחות 6 תווים)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="סיסמה חדשה"
                    className="w-full pr-10 pl-10 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  אימות סיסמה חדשה
                </label>
                <div className="relative">
                  <CheckCircle2 className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="הזן שוב את הסיסמה החדשה"
                    className="w-full pr-10 pl-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={changeLoading}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                >
                  {changeLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>שומר ומחבר...</span>
                    </>
                  ) : (
                    <span>קבע סיסמה וכנס למערכת</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setRequirePasswordChange(false)}
                  className="py-2.5 px-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-xs transition"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* VIEW 2: STANDARD LOGIN SCREEN (GOOGLE OAUTH OR LOCAL PASSWORD) */
          <div>
            {/* Google OAuth Login Button */}
            <div className="mb-6">
              <a
                href="/api/auth/google"
                className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-3 border border-slate-300"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>התחבר באמצעות חשבון Google</span>
              </a>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-slate-800 px-3 text-slate-400">או הזדהות באמצעות אימייל וסיסמה</span>
              </div>
            </div>

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
                    placeholder="michael.liarzi@gmail.com"
                    className="w-full pr-11 pl-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  סיסמה
                </label>
                <div className="relative">
                  <KeyRound className="w-5 h-5 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="הזן סיסמה אישית או ראשונית"
                    className="w-full pr-11 pl-11 py-2.5 rounded-xl border border-slate-700 bg-slate-900/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
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
                <span className="bg-slate-800 px-3 text-slate-400">כניסה מהירה לחשבונות מורשים</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleLogin("michael.liarzi@gmail.com", "Admin")}
                disabled={loading}
                className="w-full py-2.5 px-3 bg-amber-600/20 hover:bg-amber-600/30 text-amber-200 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 border border-amber-500/40 shadow-sm"
              >
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>התחבר כ-Admin (michael.liarzi@gmail.com)</span>
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleLogin("hr@example.com", "HR")}
                  disabled={loading}
                  className="py-2 px-3 bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-600"
                >
                  <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>התחבר כ-HR Demo</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLogin("admin@example.com", "Admin")}
                  disabled={loading}
                  className="py-2 px-3 bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-600"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                  <span>התחבר כ-Admin Demo</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
