"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink, MessageCircle, Link2 } from "lucide-react";

interface CandidatePortalLinkProps {
  candidateId: string;
  accessToken?: string | null;
  candidateName?: string;
  candidatePhone?: string;
  variant?: "table-row" | "card" | "compact";
  className?: string;
}

export default function CandidatePortalLink({
  candidateId,
  accessToken,
  candidateName,
  candidatePhone,
  variant = "table-row",
  className = "",
}: CandidatePortalLinkProps) {
  const [copied, setCopied] = useState(false);

  // Compute the token and full portal URL
  const token = accessToken || candidateId;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const portalUrl = origin ? `${origin}/portal/${token}` : `/portal/${token}`;

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(portalUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = portalUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(`קישור למועמד: ${portalUrl}`);
    }
  }

  // Format Israeli or international phone number for WhatsApp
  function getWhatsAppUrl(): string {
    const rawPhone = (candidatePhone || "").replace(/[^0-9]/g, "");
    let cleanPhone = rawPhone;
    if (cleanPhone.startsWith("05")) {
      cleanPhone = "972" + cleanPhone.slice(1);
    } else if (cleanPhone.startsWith("97205")) {
      cleanPhone = "972" + cleanPhone.slice(4);
    }

    const name = candidateName ? `שלום ${candidateName}` : "שלום";
    const text = `${name}, להלן הקישור האישי שלך למילוי והעלאת מסמכי הקליטה בצ'ק-ליסט:\n${portalUrl}`;

    return cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }

  if (variant === "card") {
    return (
      <div
        className={`bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-blue-50/90 border border-blue-200/80 rounded-2xl p-5 shadow-xs ${className}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>לינק אישי לפורטל המועמד</span>
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  לשליחה למועמד
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                קישור ייחודי המאפשר למועמד למלא פרטים, להעלות קבצים ולחתום דיגיטלית
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer ${
                copied
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>הלינק הועתק!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>העתק לינק</span>
                </>
              )}
            </button>

            <a
              href={getWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="שליחה ישירה בוואטסאפ"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>וואטסאפ</span>
            </a>

            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="פתיחת פורטל המועמד בלשונית חדשה"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>צפייה</span>
            </a>
          </div>
        </div>

        {/* Display full URL in read-only pill */}
        <div className="mt-3 pt-3 border-t border-blue-100/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-600 overflow-hidden font-mono bg-white/80 px-3 py-1.5 rounded-lg border border-blue-100 w-full" dir="ltr">
            <span className="truncate select-all">{portalUrl}</span>
          </div>
        </div>
      </div>
    );
  }

  // Default: table-row
  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={handleCopy}
        title="העתק לינק מועמד לפורטל"
        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
          copied
            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
            : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200"
        }`}
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold">הועתק!</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            <span>לינק מועמד</span>
          </>
        )}
      </button>

      <a
        href={getWhatsAppUrl()}
        target="_blank"
        rel="noopener noreferrer"
        title="שליחת הלינק בוואטסאפ"
        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition"
      >
        <MessageCircle className="w-3.5 h-3.5" />
      </a>

      <a
        href={portalUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="פתיחת פורטל המועמד בלשונית חדשה"
        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
