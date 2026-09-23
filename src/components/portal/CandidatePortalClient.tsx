"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Shield,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  FileText,
  User,
  Building,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Clock,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import DigitalFormView from "@/components/forms/DigitalFormView";
import { FORM_METADATA_LIST } from "@/lib/forms/formDefinitions";
import { getFullDocumentInfo } from "@/lib/forms/declarationsFullText";

interface CandidatePortalClientProps {
  candidate: {
    candidate_id: string;
    full_name: string;
    id_number: string;
    email: string;
    phone: string;
    vendor_id: string;
    project_id: string;
    vendor_company_name?: string;
  };
  token: string;
  initialChecklistItems?: Array<{
    doc_type_id: string;
    status: string;
    file_drive_id?: string | null;
    file_drive_url?: string | null;
  }>;
}

const ALL_DOC_IDS = [
  "doc_1",
  "doc_2",
  "doc_3",
  "doc_4",
  "doc_5",
  "doc_6",
  "doc_7",
  "doc_8",
  "doc_9",
];

export default function CandidatePortalClient({
  candidate,
  token,
  initialChecklistItems = [],
}: CandidatePortalClientProps) {
  // Map of completed document types
  const [completedDocIds, setCompletedDocIds] = useState<Set<string>>(() => {
    const set = new Set<string>();
    initialChecklistItems.forEach((item) => {
      const st = String(item.status || "").toLowerCase();
      if (st === "uploaded" || st === "verified") {
        set.add(item.doc_type_id);
      }
    });
    return set;
  });

  // Current active form selection
  const [selectedDocId, setSelectedDocId] = useState<string>("doc_1");
  const [isFinalSubmitted, setIsFinalSubmitted] = useState(false);

  // Compute progress
  const completedCount = completedDocIds.size;
  const progressPercent = Math.round((completedCount / ALL_DOC_IDS.length) * 100);
  const isAllCompleted = completedCount >= ALL_DOC_IDS.length;

  // Next pending doc
  const nextPendingDocId = useMemo(() => {
    const currentIndex = ALL_DOC_IDS.indexOf(selectedDocId);
    // Find next in order
    for (let i = currentIndex + 1; i < ALL_DOC_IDS.length; i++) {
      if (!completedDocIds.has(ALL_DOC_IDS[i])) {
        return ALL_DOC_IDS[i];
      }
    }
    // Or any uncompleted
    for (let i = 0; i < ALL_DOC_IDS.length; i++) {
      if (!completedDocIds.has(ALL_DOC_IDS[i])) {
        return ALL_DOC_IDS[i];
      }
    }
    return null;
  }, [selectedDocId, completedDocIds]);

  // When a form is successfully signed and uploaded
  async function handleFormSubmitted(submittedDocId: string) {
    const nextSet = new Set(completedDocIds);
    nextSet.add(submittedDocId);
    setCompletedDocIds(nextSet);

    // If this completed all 9 forms, notify portal submit API
    if (nextSet.size >= ALL_DOC_IDS.length) {
      try {
        await fetch("/api/portal/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            candidate_id: candidate.candidate_id,
            full_name: candidate.full_name,
            id_number: candidate.id_number,
            project_id: candidate.project_id,
            vendor_company_name: candidate.vendor_company_name,
            // dummy answers for legacy schema if needed
            birth_date: "2000-01-01",
            birth_country: "ישראל",
            marital_status: "רווק/ה",
            address: "הוזן בטפסים החתומים",
            army_service: 'שירות מלא בצה"ל',
            ref1_name: "ממליץ 1",
            ref1_phone: "0500000000",
            ref2_name: "ממליץ 2",
            ref2_phone: "0500000000",
            agreed_doc_2: true,
            agreed_doc_3: true,
            agreed_doc_4: true,
            agreed_doc_5: true,
            agreed_doc_6: true,
            agreed_doc_7: true,
            agreed_doc_8: true,
            job_title: "מועמד לפרויקט",
            agreed_doc_9: true,
            signature_data_url: "data:image/png;base64,completed_suite",
            is_acknowledged: true,
          }),
        });
      } catch (err) {
        console.error("Error finalizing candidate submission:", err);
      }
      setIsFinalSubmitted(true);
    }
  }

  function handleNavigateNext() {
    if (nextPendingDocId) {
      setSelectedDocId(nextPendingDocId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // Celebratory final completion screen
  if (isFinalSubmitted || (isAllCompleted && completedDocIds.size >= 9)) {
    return (
      <div
        className="max-w-2xl mx-auto my-12 p-8 sm:p-12 bg-white border border-emerald-200 rounded-3xl shadow-xl text-center space-y-6"
        dir="rtl"
      >
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            תהליך החתימה הושלם במלואו (100%)
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            כל 9 טפסי הקליטה נחתמו בהצלחה!
          </h1>
          <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            שלום {candidate.full_name}, כל 9 הטפסים הרשמיים נחתמו בחתימתך הדיגיטלית,
            הופקו לקבצי PDF באיכות גבוהה ונשמרו בתיקיית ה-Google Drive האישית שלך.
          </p>
        </div>

        {/* 9 Documents Summary List */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-right space-y-2.5">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            רשימת המסמכים שנחתמו והועלו ל-Drive:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {ALL_DOC_IDS.map((id, idx) => {
              const info = getFullDocumentInfo(id);
              return (
                <div
                  key={id}
                  className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 text-slate-800"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="font-semibold truncate">
                    {idx + 1}. {info.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-slate-500">
          פנייתך הועברה להמשך טיפול במחלקת ביטחון שדה ומשאבי אנוש. הודעה תישלח עם התקדמות התהליך.
        </p>

        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-8 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition"
          >
            חזרה לדף הראשי
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6" dir="rtl">
      {/* Candidate Top Header Box */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 p-1.5 flex items-center justify-center shadow-sm shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logos/app_logo.png"
                alt="Onboarding Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  פורטל קליטת מועמד - 9 טפסי קליטה
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                שלום <strong className="text-slate-800">{candidate.full_name}</strong>,
                לפניך 9 טפסים רשמיים למילוי וחתימה אלקטרונית (E-Sign).
              </p>
            </div>
          </div>

          {/* Progress Widget */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 min-w-[220px]">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
              <span>התקדמות חתימה</span>
              <span className="font-mono text-blue-600">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-500 mt-1.5 text-center font-medium">
              הושלמו {completedCount} מתוך {ALL_DOC_IDS.length} טפסים
            </div>
          </div>
        </div>

        {/* Candidate Meta Pill Details */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs pt-2 border-t border-slate-100">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-700">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>ת.ז: {candidate.id_number}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-700">
            <Briefcase className="w-3.5 h-3.5 text-slate-500" />
            <span>פרויקט: {candidate.project_id}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-700">
            <Building className="w-3.5 h-3.5 text-slate-500" />
            <span>ספק: {candidate.vendor_company_name || candidate.vendor_id}</span>
          </span>
        </div>
      </div>

      {/* Forms Selector Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 mb-2">
          <span className="text-xs font-bold text-slate-700">
            בחר טופס למילוי וחתימה:
          </span>
          <span className="text-[11px] text-slate-400">
            טופס עם סימון ירוק נחתם בהצלחה
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-2">
          {ALL_DOC_IDS.map((id, index) => {
            const info = getFullDocumentInfo(id);
            const isCompleted = completedDocIds.has(id);
            const isSelected = selectedDocId === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedDocId(id)}
                className={`flex items-center justify-between p-3 rounded-xl border text-right transition ${
                  isSelected
                    ? "border-blue-600 bg-blue-50/70 shadow-xs"
                    : isCompleted
                    ? "border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/60"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      isCompleted
                        ? "bg-emerald-100 text-emerald-700"
                        : isSelected
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <span
                      className={`text-xs font-bold block truncate ${
                        isSelected
                          ? "text-blue-900"
                          : isCompleted
                          ? "text-emerald-900"
                          : "text-slate-800"
                      }`}
                    >
                      {info.name}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {info.shortDesc}
                    </span>
                  </div>
                </div>

                <div className="flex-shrink-0 mr-2">
                  {isCompleted ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>נחתם</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      ממתין
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Form Component View */}
      <div className="pt-2">
        <DigitalFormView
          key={selectedDocId}
          docTypeId={selectedDocId}
          candidate={candidate}
          isEmbeddedInPortal={true}
          nextDocTypeId={nextPendingDocId}
          onFormSubmitted={(submittedId) => handleFormSubmitted(submittedId)}
          onNavigateNext={handleNavigateNext}
        />
      </div>
    </div>
  );
}
