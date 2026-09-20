"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  Building2,
  Mail,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  UserCheck,
  ShieldAlert,
  UserPlus,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Building,
  User,
} from "lucide-react";

function UnifiedIdentificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const callbackUrl = searchParams.get("callbackUrl");
  const urlError = searchParams.get("error");

  // Mode: "login" or "register"
  const [activeTab, setActiveTab] = useState<"login" | "register">(
    tabParam === "register" ? "register" : "login"
  );

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Forced password change for first-time login
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);

  // Vendor self-registration state
  const [regCompanyName, setRegCompanyName] = useState("");
  const [regContactName, setRegContactName] = useState("");
  const [regEmail, setRegEmail] = useState("");

  useEffect(() => {
    if (urlError) {
      setError(decodeURIComponent(urlError));
    }
  }, [urlError]);

  // Unified username/email + password login
  async function handleUnifiedLogin(customEmail?: string, customPassword?: string) {
    setError(null);
    setLoading(true);

    const targetEmail = customEmail || email;
    const targetPassword = customPassword !== undefined ? customPassword : password;

    try {
      const res = await fetch("/api/auth/unified-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          password: targetPassword || undefined,
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

      // Automatic role-based routing
      const targetUrl = callbackUrl || data.redirectUrl || "/admin";
      router.push(targetUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בביצוע ההתחברות");
    } finally {
      setLoading(false);
    }
  }

  // First-time password change handler
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

      router.push(callbackUrl || "/admin");
      router.refresh();
    } catch (err) {
      setChangeError(err instanceof Error ? err.message : "שגיאה בעדכון הסיסמה");
    } finally {
      setChangeLoading(false);
    }
  }

  // Vendor self-service registration handler
  async function handleVendorRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/vendor/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: regCompanyName,
          contact_name: regContactName,
          contact_email: regEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "שגיאה ברישום הספק");
      }

      setSuccessMsg("ההרשמה הושלמה בהצלחה! מעביר אותך לפורטל הספקים...");
      setTimeout(() => {
        router.push("/vendor");
        router.refresh();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה ברישום הספק");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-slate-100" dir="rtl">
      <div className="max-w-md w-full bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Brand / System Logo Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            מערכת Onboarding Checklist
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            שער כניסה מאוחד: מנהלי מערכת, משאבי אנוש וספקים
          </p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Success Banner */}
        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Top-level Navigation Switcher: Login vs Vendor Registration */}
        {!requirePasswordChange && (
          <div className="grid grid-cols-2 p-1 bg-slate-900/80 rounded-2xl border border-slate-700/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab("login");
                setError(null);
              }}
              className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeTab === "login"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>התחברות למערכת</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("register");
                setError(null);
              }}
              className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeTab === "register"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>הרשמת ספק חדש</span>
            </button>
          </div>
        )}

        {/* VIEW 1: FIRST-TIME FORCED PASSWORD CHANGE */}
        {requirePasswordChange ? (
          <div className="space-y-4">
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
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{changeError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  כתובת אימייל
                </label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-400 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  סיסמה נוכחית (ראשונית)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="הזן את הסיסמה שנמסרה לך"
                    className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  סיסמה אישית חדשה (לפחות 6 תווים)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="סיסמה חדשה"
                    className="w-full pr-9 pl-9 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <CheckCircle2 className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="הזן שוב את הסיסמה החדשה"
                    className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={changeLoading}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-md shadow-emerald-600/30 disabled:opacity-50"
                >
                  {changeLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>שומר ומחבר...</span>
                    </>
                  ) : (
                    <span>קבע סיסמה וכנס</span>
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
        ) : activeTab === "register" ? (
          /* VIEW 2: VENDOR SELF-REGISTRATION */
          <form onSubmit={handleVendorRegister} className="space-y-4">
            <div className="text-center pb-1">
              <h2 className="text-sm font-bold text-white">פתיחת חשבון ספק חדש</h2>
              <p className="text-xs text-slate-400">
                הרשם כדי לקבל גישה לקליטת מועמדים, מילוי טפסים דיגיטליים והעלאת מסמכים
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                שם החברה / הספק
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={regCompanyName}
                  onChange={(e) => setRegCompanyName(e.target.value)}
                  placeholder="למשל: אלפא טכנולוגיות בע״מ"
                  className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                שם מלא של איש הקשר
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={regContactName}
                  onChange={(e) => setRegContactName(e.target.value)}
                  placeholder="למשל: דניאל כהן"
                  className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                כתובת אימייל ליצירת קשר והתחברות (כולל Google)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="daniel@alpha-tech.co.il"
                  className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>רושם ספק ומחבר...</span>
                </>
              ) : (
                <>
                  <span>הירשם והיכנס לפורטל</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setActiveTab("login")}
                className="text-xs text-blue-400 hover:underline"
              >
                כבר רשום במערכת? עבור להתחברות
              </button>
            </div>
          </form>
        ) : (
          /* VIEW 3: UNIFIED LOGIN (GOOGLE AUTH + USERNAME/PASSWORD) */
          <div className="space-y-5">
            {/* 1. Google OAuth Button */}
            <div>
              <a
                href="/api/auth/google"
                className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-3 border border-slate-300"
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
              <span className="block text-center text-[11px] text-slate-400 mt-1.5">
                כניסה מהירה למנהלים, משאבי אנוש וספקים רשומים
              </span>
            </div>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-slate-800 px-3 text-slate-400">
                  או כניסה באמצעות שם משתמש / אימייל וסיסמה
                </span>
              </div>
            </div>

            {/* 2. Username / Email & Password Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUnifiedLogin();
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  כתובת אימייל / שם משתמש
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  סיסמה
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="הזן סיסמה (עבור מנהלים / משאבי אנוש)"
                    className="w-full pr-10 pl-9 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>מאמת ומנתב...</span>
                  </>
                ) : (
                  <>
                    <span>כניסה למערכת</span>
                    <ArrowLeft className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-white" dir="rtl">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-sm text-slate-400">טוען את מסך הכניסה...</span>
          </div>
        </div>
      }
    >
      <UnifiedIdentificationContent />
    </Suspense>
  );
}
