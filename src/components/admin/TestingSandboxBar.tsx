"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  Building2,
  UserCheck,
  ExternalLink,
  RotateCcw,
  Loader2,
  ChevronDown,
  Sparkles,
} from "lucide-react";

interface VendorOption {
  vendor_id: string;
  company_name: string;
}

interface CandidateOption {
  candidate_id: string;
  full_name: string;
  access_token?: string;
}

interface TestingSandboxBarProps {
  vendors?: VendorOption[];
  candidates?: CandidateOption[];
  onDataReset?: () => void;
}

export default function TestingSandboxBar({
  vendors = [],
  candidates = [],
  onDataReset,
}: TestingSandboxBarProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [isResetting, setIsResetting] = useState(false);
  const [envName, setEnvName] = useState<"staging" | "production" | "local">("local");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      if (host.includes("localhost") || host.includes("127.0.0.1")) {
        setEnvName("local");
      } else if (host.includes("-git-") || host.includes("staging") || host.includes("preview")) {
        setEnvName("staging");
      } else {
        setEnvName("production");
      }
    }
  }, []);

  useEffect(() => {
    if (vendors.length > 0 && !selectedVendorId) {
      setSelectedVendorId(vendors[0].vendor_id);
    }
  }, [vendors, selectedVendorId]);

  async function handleSwitchToVendor() {
    try {
      setLoadingAction("vendor");
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "vendor",
          vendor_id: selectedVendorId || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.push(data.redirectUrl || "/vendor");
      }
    } catch (err) {
      console.error("Error switching to vendor:", err);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleSwitchToHr() {
    try {
      setLoadingAction("hr");
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "hr" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.refresh();
      }
    } catch (err) {
      console.error("Error switching to HR:", err);
    } finally {
      setLoadingAction(null);
    }
  }

  function handleOpenCandidatePortal() {
    if (candidates.length === 0) {
      alert("אין עדיין מועמדים במערכת. צור מועמד חדש כדי לפתוח את הפורטל שלו.");
      return;
    }
    const candidate = candidates[0]; // Most recent candidate
    const token = candidate.access_token || candidate.candidate_id;
    window.open(`/portal/${token}`, "_blank");
  }

  async function handleResetData() {
    if (!confirm("האם אתה בטוח שברצונך לאפס את כל נתוני הבדיקה למצב 0 התחלתי?")) {
      return;
    }
    try {
      setIsResetting(true);
      const res = await fetch("/api/admin/test-reset", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("onboarding_demo_candidates");
        }
        alert(data.message || "נתוני הבדיקה אופסו בהצלחה למצב 0!");
        onDataReset?.();
        router.refresh();
      }
    } catch (err) {
      console.error("Error resetting data:", err);
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="p-4 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 rounded-2xl shadow-xs space-y-3"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Title and Environment Badge */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
            <FlaskConical className="w-4 h-4 text-amber-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-slate-900">
                ארגז חול לבדיקות (Testing Sandbox)
              </span>
              {envName === "staging" ? (
                <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                  סביבת בדיקות (Staging)
                </span>
              ) : envName === "production" ? (
                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                  סביבת ייצור (Production)
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full">
                  סביבה מקומית (Localhost)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600">
              מעבר מהיר בין תפקידים כדי לסמלץ ולבדוק את התהליך מקצה לקצה ללא צורך בהחלפת יוזרים.
            </p>
          </div>
        </div>

        {/* Quick Persona Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Vendor impersonation dropdown + button */}
          <div className="flex items-center bg-white border border-amber-300 rounded-xl overflow-hidden shadow-2xs">
            {vendors.length > 1 && (
              <select
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 px-2 py-1.5 border-l border-amber-200 focus:outline-hidden"
              >
                {vendors.map((v) => (
                  <option key={v.vendor_id} value={v.vendor_id}>
                    {v.company_name}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={handleSwitchToVendor}
              disabled={loadingAction === "vendor"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-100/50 transition cursor-pointer disabled:opacity-50"
            >
              {loadingAction === "vendor" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-amber-700" />
              )}
              <span>היכנס כספק</span>
            </button>
          </div>

          {/* HR View button */}
          <button
            type="button"
            onClick={handleSwitchToHr}
            disabled={loadingAction === "hr"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {loadingAction === "hr" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UserCheck className="w-3.5 h-3.5 text-slate-600" />
            )}
            <span>תצוגת משאבי אנוש (HR)</span>
          </button>

          {/* Candidate Portal Direct Link */}
          <button
            type="button"
            onClick={handleOpenCandidatePortal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>פתח פורטל מועמד לבדיקה</span>
          </button>

          {/* Reset to State 0 button */}
          <button
            type="button"
            onClick={handleResetData}
            disabled={isResetting}
            title="איפוס כל המועמדים והמסמכים של הבדיקות חזרה למצב התחלתי נקי"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {isResetting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            <span>איפוס מצב 0</span>
          </button>
        </div>
      </div>
    </div>
  );
}
