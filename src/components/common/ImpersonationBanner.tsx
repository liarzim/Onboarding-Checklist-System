"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeft, Loader2 } from "lucide-react";

export default function ImpersonationBanner() {
  const router = useRouter();
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    function checkCookie() {
      if (typeof document === "undefined") return;
      const match = document.cookie.match(/(?:^|;\s*)impersonation_active=([^;]+)/);
      if (match && match[1]) {
        setActiveRole(decodeURIComponent(match[1]));
      } else {
        setActiveRole(null);
      }
    }
    checkCookie();
    const interval = setInterval(checkCookie, 2000);
    return () => clearInterval(interval);
  }, []);

  async function handleRestoreAdmin() {
    try {
      setIsRestoring(true);
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "admin_restore" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveRole(null);
        router.push("/admin");
        router.refresh();
      }
    } catch (err) {
      console.error("Error restoring admin:", err);
    } finally {
      setIsRestoring(false);
    }
  }

  if (!activeRole) return null;

  const roleText =
    activeRole === "vendor"
      ? "ספק (Vendor)"
      : activeRole === "hr"
      ? "משאבי אנוש (HR)"
      : activeRole;

  return (
    <div
      dir="rtl"
      className="sticky top-0 z-50 bg-amber-500 text-amber-950 px-4 py-2 text-xs sm:text-sm font-bold shadow-md flex items-center justify-between border-b border-amber-600 animate-in fade-in slide-in-from-top-2"
    >
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-950 animate-pulse shrink-0" />
        <span>
          ארגז חול בדיקות: אתה מחובר כרגע בזהות <strong>{roleText}</strong>
        </span>
      </div>

      <button
        type="button"
        onClick={handleRestoreAdmin}
        disabled={isRestoring}
        className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-950 hover:bg-black text-amber-100 rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
      >
        {isRestoring ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <ArrowLeft className="w-3.5 h-3.5" />
        )}
        <span>חזרה לחשבון מנהל (Admin)</span>
      </button>
    </div>
  );
}
