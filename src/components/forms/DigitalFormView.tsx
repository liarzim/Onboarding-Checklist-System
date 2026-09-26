"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import SignaturePad from "./SignaturePad";
import { generatePdfFromElement } from "@/lib/forms/pdfGenerator";
import { FORM_METADATA_LIST } from "@/lib/forms/formDefinitions";
import {
  getFullDocumentInfo,
  type FullDocumentInfo,
} from "@/lib/forms/declarationsFullText";
import MediaUploadCard from "./MediaUploadCard";

interface CandidateData {
  candidate_id: string;
  full_name: string;
  id_number: string;
  email: string;
  phone: string;
  vendor_id: string;
  project_id: string;
  drive_folder_id?: string;
  vendor_company_name?: string;
}

interface DigitalFormViewProps {
  docTypeId: string;
  candidate: CandidateData;
  onFormSubmitted?: (docTypeId: string) => void;
  isEmbeddedInPortal?: boolean;
  nextDocTypeId?: string | null;
  onNavigateNext?: () => void;
  token?: string;
}

export default function DigitalFormView({
  docTypeId,
  candidate,
  onFormSubmitted,
  isEmbeddedInPortal = false,
  nextDocTypeId = null,
  onNavigateNext,
  token,
}: DigitalFormViewProps) {
  const router = useRouter();
  const printRef = useRef<HTMLDivElement | null>(null);

  // If doc_10 or doc_11, render media upload card
  if (docTypeId === "doc_10" || docTypeId === "doc_11") {
    return (
      <MediaUploadCard
        docTypeId={docTypeId as "doc_10" | "doc_11"}
        candidate={candidate}
        token={token}
        nextDocTypeId={nextDocTypeId}
        onUploaded={(submittedId) => onFormSubmitted?.(submittedId)}
        onNavigateNext={onNavigateNext}
      />
    );
  }

  // Dynamic template content loading (supports future replacement/editing)
  const [docInfo, setDocInfo] = useState<FullDocumentInfo>(() =>
    getFullDocumentInfo(docTypeId)
  );

  useEffect(() => {
    setDocInfo(getFullDocumentInfo(docTypeId));
  }, [docTypeId]);

  const meta = FORM_METADATA_LIST[docTypeId] || {
    docTypeId,
    title: docInfo.name || "טופס קליטה מקוון",
    subtitle: docInfo.shortDesc || "מסמך רשמי לקליטת עובד/ספק",
    category: "security",
    version: docInfo.version || "1.0",
  };

  const todayStr = new Date().toLocaleDateString("he-IL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // State
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPreviousDataLoaded, setIsPreviousDataLoaded] = useState(false);

  // doc_1 fields
  const [q1BirthDate, setQ1BirthDate] = useState("");
  const [q1BirthCountry, setQ1BirthCountry] = useState("ישראל");
  const [q1AliyahYear, setQ1AliyahYear] = useState("");
  const [q1MaritalStatus, setQ1MaritalStatus] = useState("רווק/ה");
  const [q1OtherCitizenship, setQ1OtherCitizenship] = useState("אין");
  const [q1Address, setQ1Address] = useState("");
  const [q1ArmyService, setQ1ArmyService] = useState('שירות מלא בצה"ל');
  const [q1MilitaryId, setQ1MilitaryId] = useState("");
  const [q1MilitaryRole, setQ1MilitaryRole] = useState("");
  const [q1MilitaryYears, setQ1MilitaryYears] = useState("");
  const [q1ExemptionReason, setQ1ExemptionReason] = useState("");
  const [q1EducationHigh, setQ1EducationHigh] = useState("");
  const [q1EducationAcademic, setQ1EducationAcademic] = useState("");
  const [q1Workplace1, setQ1Workplace1] = useState("");
  const [q1Workplace2, setQ1Workplace2] = useState("");
  const [q1Ref1, setQ1Ref1] = useState("");
  const [q1Ref2, setQ1Ref2] = useState("");

  // doc_4 fields
  const [q4FatherName, setQ4FatherName] = useState("");
  const [q4Address, setQ4Address] = useState("");

  // doc_9 fields (faithful to original הנפקת כרטיס.docx)
  const [q9NameEn, setQ9NameEn] = useState("");
  const [q9RoleInProject, setQ9RoleInProject] = useState("");
  const [q9ManagerName, setQ9ManagerName] = useState("");
  const [q9StartDate, setQ9StartDate] = useState(todayStr);
  const [q9PreviousGov, setQ9PreviousGov] = useState("לא");
  const [q9PreviousDates, setQ9PreviousDates] = useState("");

  // Acknowledgement checkbox
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Load previous form answers for editing/correction
  useEffect(() => {
    let isCancelled = false;

    function applySavedData(data: any) {
      if (!data || typeof data !== "object") return;
      if (data.q1BirthDate !== undefined) setQ1BirthDate(data.q1BirthDate || "");
      if (data.q1BirthCountry !== undefined) setQ1BirthCountry(data.q1BirthCountry || "ישראל");
      if (data.q1AliyahYear !== undefined) setQ1AliyahYear(data.q1AliyahYear || "");
      if (data.q1MaritalStatus !== undefined) setQ1MaritalStatus(data.q1MaritalStatus || "רווק/ה");
      if (data.q1OtherCitizenship !== undefined) setQ1OtherCitizenship(data.q1OtherCitizenship || "אין");
      if (data.q1Address !== undefined) setQ1Address(data.q1Address || "");
      if (data.q1ArmyService !== undefined) setQ1ArmyService(data.q1ArmyService || 'שירות מלא בצה"ל');
      if (data.q1MilitaryId !== undefined) setQ1MilitaryId(data.q1MilitaryId || "");
      if (data.q1MilitaryRole !== undefined) setQ1MilitaryRole(data.q1MilitaryRole || "");
      if (data.q1MilitaryYears !== undefined) setQ1MilitaryYears(data.q1MilitaryYears || "");
      if (data.q1ExemptionReason !== undefined) setQ1ExemptionReason(data.q1ExemptionReason || "");
      if (data.q1EducationHigh !== undefined) setQ1EducationHigh(data.q1EducationHigh || "");
      if (data.q1EducationAcademic !== undefined) setQ1EducationAcademic(data.q1EducationAcademic || "");
      if (data.q1Workplace1 !== undefined) setQ1Workplace1(data.q1Workplace1 || "");
      if (data.q1Workplace2 !== undefined) setQ1Workplace2(data.q1Workplace2 || "");
      if (data.q1Ref1 !== undefined) setQ1Ref1(data.q1Ref1 || "");
      if (data.q1Ref2 !== undefined) setQ1Ref2(data.q1Ref2 || "");

      if (data.q4FatherName !== undefined) setQ4FatherName(data.q4FatherName || "");
      if (data.q4Address !== undefined) setQ4Address(data.q4Address || "");

      if (data.q9NameEn !== undefined) setQ9NameEn(data.q9NameEn || "");
      if (data.q9RoleInProject !== undefined) setQ9RoleInProject(data.q9RoleInProject || "");
      if (data.q9ManagerName !== undefined) setQ9ManagerName(data.q9ManagerName || "");
      if (data.q9StartDate !== undefined) setQ9StartDate(data.q9StartDate || todayStr);
      if (data.q9PreviousGov !== undefined) setQ9PreviousGov(data.q9PreviousGov || "לא");
      if (data.q9PreviousDates !== undefined) setQ9PreviousDates(data.q9PreviousDates || "");
    }

    async function loadPreviousFormData() {
      // 1. Check client localStorage first for immediate rendering
      const localKey = `form_data_${candidate.candidate_id}_${docTypeId}`;
      const localDataStr = typeof window !== "undefined" ? localStorage.getItem(localKey) : null;
      if (localDataStr) {
        try {
          const parsed = JSON.parse(localDataStr);
          applySavedData(parsed);
          setIsPreviousDataLoaded(true);
        } catch {
          // Ignore
        }
      }

      // 2. Fetch server database values
      try {
        const queryParams = new URLSearchParams({
          candidate_id: candidate.candidate_id,
          doc_type_id: docTypeId,
        });
        if (token) queryParams.set("token", token);

        const res = await fetch(`/api/documents/form-data?${queryParams.toString()}`);
        if (!res.ok) return;
        const json = await res.json();

        if (!isCancelled && json.data) {
          applySavedData(json.data);
          setIsPreviousDataLoaded(true);
        }
      } catch (err) {
        console.warn("Could not load previous form data:", err);
      }
    }

    loadPreviousFormData();

    return () => {
      isCancelled = true;
    };
  }, [docTypeId, candidate.candidate_id, token, todayStr]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!signatureDataUrl) {
      setErrorMessage("חובה להוסיף חתימה דיגיטלית בתיבת החתימה לפני השליחה");
      return;
    }

    if (!agreeTerms) {
      setErrorMessage("יש לאשר את תנאי ההצהרה כדי להמשיך");
      return;
    }

    if (!printRef.current) {
      setErrorMessage("שגיאה במערכת: לא ניתן לייצר את תמונת המסמך");
      return;
    }

    try {
      setIsSubmitting(true);

      const currentAnswers = {
        q1BirthDate,
        q1BirthCountry,
        q1AliyahYear,
        q1MaritalStatus,
        q1OtherCitizenship,
        q1Address,
        q1ArmyService,
        q1MilitaryId,
        q1MilitaryRole,
        q1MilitaryYears,
        q1ExemptionReason,
        q1EducationHigh,
        q1EducationAcademic,
        q1Workplace1,
        q1Workplace2,
        q1Ref1,
        q1Ref2,
        q4FatherName,
        q4Address,
        q9NameEn,
        q9RoleInProject,
        q9ManagerName,
        q9StartDate,
        q9PreviousGov,
        q9PreviousDates,
      };

      // Save to localStorage for instant client persistence
      try {
        localStorage.setItem(
          `form_data_${candidate.candidate_id}_${docTypeId}`,
          JSON.stringify(currentAnswers)
        );
      } catch {
        // Ignore
      }

      // 1. Generate formatted PDF File directly from the rendered form DOM
      const cleanId = candidate.id_number ? `.${candidate.id_number}` : "";
      const targetFileName = `${docInfo.name || meta.title}.${candidate.full_name}${cleanId}.pdf`;
      const pdfFile = await generatePdfFromElement(printRef.current, targetFileName);

      // 2. Prepare FormData for /api/documents/upload
      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append("candidate_id", candidate.candidate_id);
      formData.append("doc_type_id", docTypeId);
      formData.append("form_data", JSON.stringify(currentAnswers));
      if (token) {
        formData.append("token", token);
      }

      // 3. Post to the documents upload API
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "שגיאה בשמירת המסמך והעלאתו ל-Drive");
      }

      setSuccessMessage("הטופס נחתם, הופק ל-PDF כהלכה ונשמר בתיקיית Google Drive!");

      if (onFormSubmitted) {
        onFormSubmitted(docTypeId);
      }

      // If embedded in candidate portal and there is a next document, smoothly advance
      if (isEmbeddedInPortal && onNavigateNext && nextDocTypeId) {
        setTimeout(() => {
          onNavigateNext();
        }, 1200);
      } else if (!isEmbeddedInPortal) {
        setTimeout(() => {
          router.push(`/vendor/candidate/${candidate.candidate_id}`);
        }, 1500);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "שגיאה בלתי צפויה בהעלאת הטופס"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12" dir="rtl">
      {/* Top Navigation Bar - only show if not embedded */}
      {!isEmbeddedInPortal && (
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <Link
            href={`/vendor/candidate/${candidate.candidate_id}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition"
          >
            <ArrowRight className="w-4 h-4" />
            <span>חזרה לצ'קליסט המועמד</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{candidate.full_name}</span>
            <span>•</span>
            <span>{docInfo.name}</span>
          </div>
        </div>
      )}

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          {isEmbeddedInPortal && onNavigateNext && nextDocTypeId && (
            <button
              type="button"
              onClick={onNavigateNext}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
            >
              <span>המשך לטופס הבא</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Notice banner when previous data was loaded */}
      {isPreviousDataLoaded && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-amber-600" />
            <span>
              <strong>נתונים שמולאו בעבר נטענו לטופס זה.</strong> באפשרותך לערוך ולתקן את השדות, לחתום מחדש ולשמור את הטופס המעודכן.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsPreviousDataLoaded(false)}
            className="text-amber-700 hover:text-amber-900 text-xs underline font-semibold flex-shrink-0"
          >
            הבנתי
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Printable Form Container - Captured by html2canvas */}
        <div
          ref={printRef}
          className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-sm space-y-8 text-slate-900"
          dir="rtl"
        >
          {/* Formal Authentic Government Header with Official Logos */}
          <div className="pdf-section border-b-2 border-slate-900 pb-5 space-y-4" data-pdf-section="header">
            <div className="flex items-center justify-between">
              {/* Right Side: gov.il Logo and Ministry Department */}
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/gov_il_logo.jpg"
                  alt="gov.il"
                  className="h-10 w-auto object-contain"
                />
                <div className="text-right leading-tight">
                  <span className="block text-xs font-black text-slate-900">מדינת ישראל</span>
                  <span className="block text-[11px] font-bold text-slate-700">החשב הכללי</span>
                  <span className="block text-[10px] text-slate-500 font-medium">התקשוב הממשלתי (מרכב"ה)</span>
                </div>
              </div>

              {/* Center: Title & Subtitle */}
              <div className="text-center px-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 underline decoration-slate-400 underline-offset-4">
                  {docInfo.name}
                </h1>
                <p className="text-xs text-slate-600 font-medium mt-1">{docInfo.shortDesc}</p>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  <span>תאריך: </span>
                  <span className="font-semibold text-slate-800">{todayStr}</span>
                </div>
              </div>

              {/* Left Side: State of Israel Emblem (Magen David) */}
              <div className="flex items-center justify-end">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/israel_emblem.png"
                  alt="סמל מדינת ישראל"
                  className="h-14 sm:h-16 w-auto object-contain"
                />
              </div>
            </div>

            {docInfo.lawReference && (
              <div className="text-center text-[11px] text-blue-800 font-semibold bg-blue-50/70 py-1 px-3 rounded-lg border border-blue-200">
                בסיס חוקי ומנהלי: {docInfo.lawReference}
              </div>
            )}
          </div>

          {/* Candidate Profile Details Summary Box */}
          <div className="pdf-section bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3" data-pdf-section="candidate-details">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              פרטי המועמד/ת והשיוך
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">שם מלא:</span>
                <span className="font-bold text-slate-900">{candidate.full_name}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">תעודת זהות:</span>
                <span className="font-mono font-bold text-slate-900">{candidate.id_number}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">פרויקט יעד:</span>
                <span className="font-semibold text-slate-900">{candidate.project_id}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">חברת ספק / מעסיק:</span>
                <span className="font-semibold text-slate-900">
                  {candidate.vendor_company_name || candidate.vendor_id}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">טלפון:</span>
                <span className="font-mono text-slate-700">{candidate.phone || "לא צוין"}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">דואר אלקטרוני:</span>
                <span className="font-mono text-slate-700">{candidate.email}</span>
              </div>
            </div>
          </div>

          {/* Form Specific Inputs & Layout */}
          {docTypeId === "doc_1" && (
            <Doc1PersonalQuestionnaire
              birthDate={q1BirthDate}
              setBirthDate={setQ1BirthDate}
              birthCountry={q1BirthCountry}
              setBirthCountry={setQ1BirthCountry}
              aliyahYear={q1AliyahYear}
              setAliyahYear={setQ1AliyahYear}
              maritalStatus={q1MaritalStatus}
              setMaritalStatus={setQ1MaritalStatus}
              otherCitizenship={q1OtherCitizenship}
              setOtherCitizenship={setQ1OtherCitizenship}
              address={q1Address}
              setAddress={setQ1Address}
              armyService={q1ArmyService}
              setArmyService={setQ1ArmyService}
              militaryId={q1MilitaryId}
              setMilitaryId={setQ1MilitaryId}
              militaryRole={q1MilitaryRole}
              setMilitaryRole={setQ1MilitaryRole}
              militaryYears={q1MilitaryYears}
              setMilitaryYears={setQ1MilitaryYears}
              exemptionReason={q1ExemptionReason}
              setExemptionReason={setQ1ExemptionReason}
              educationHigh={q1EducationHigh}
              setEducationHigh={setQ1EducationHigh}
              educationAcademic={q1EducationAcademic}
              setEducationAcademic={setQ1EducationAcademic}
              workplace1={q1Workplace1}
              setWorkplace1={setQ1Workplace1}
              workplace2={q1Workplace2}
              setWorkplace2={setQ1Workplace2}
              ref1={q1Ref1}
              setRef1={setQ1Ref1}
              ref2={q1Ref2}
              setRef2={setQ1Ref2}
              docInfo={docInfo}
            />
          )}

          {docTypeId === "doc_2" && <DocClausesOnly docInfo={docInfo} />}

          {docTypeId === "doc_3" && <DocClausesOnly docInfo={docInfo} candidate={candidate} />}

          {docTypeId === "doc_4" && (
            <Doc4CriminalRecordConsent
              candidate={candidate}
              fatherName={q4FatherName}
              setFatherName={setQ4FatherName}
              address={q4Address}
              setAddress={setQ4Address}
              docInfo={docInfo}
            />
          )}

          {docTypeId === "doc_5" && <DocClausesOnly docInfo={docInfo} candidate={candidate} />}

          {docTypeId === "doc_6" && <DocClausesOnly docInfo={docInfo} candidate={candidate} />}

          {docTypeId === "doc_7" && <DocClausesOnly docInfo={docInfo} candidate={candidate} />}

          {docTypeId === "doc_8" && <DocClausesOnly docInfo={docInfo} candidate={candidate} />}

          {docTypeId === "doc_9" && (
            <Doc9SmartCardRequest
              candidate={candidate}
              nameEn={q9NameEn}
              setNameEn={setQ9NameEn}
              roleInProject={q9RoleInProject}
              setRoleInProject={setQ9RoleInProject}
              managerName={q9ManagerName}
              setManagerName={setQ9ManagerName}
              startDate={q9StartDate}
              setStartDate={setQ9StartDate}
              previousGov={q9PreviousGov}
              setPreviousGov={setQ9PreviousGov}
              previousDates={q9PreviousDates}
              setPreviousDates={setQ9PreviousDates}
              docInfo={docInfo}
            />
          )}

          {/* Signature and Legal Declaration Section */}
          <div className="pdf-section pt-4 border-t border-slate-200 space-y-6" data-pdf-section="signature-footer">
            <div>
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-700 leading-relaxed font-medium">
                  הנני מאשר/ת בחתימתי כי קראתי בעיון את כל סעיפי המסמך, הבנתי את תוכנו ומשמעותו המשפטית,
                  והפרטים שנמסרו על ידי נכונים ומלאים.
                </span>
              </label>
            </div>

            {/* Digital Signature Area */}
            <div>
              <SignaturePad
                onSignatureChange={setSignatureDataUrl}
                signerName={candidate.full_name}
              />
            </div>

            {/* Formal Authentic Government Footer */}
            <div className="pt-6 border-t-2 border-slate-900 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-600 gap-3">
              <div className="text-right">
                <span>אוצר ברשת: </span>
                <span className="font-mono text-blue-700 font-semibold">www.mof.gov.il</span>
                <span className="mx-1.5">|</span>
                <span>רח' יפו 234 ירושלים</span>
              </div>
              <div className="flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/gov_il_logo.jpg"
                  alt="gov.il"
                  className="h-6 w-auto object-contain opacity-80"
                />
              </div>
              <div className="text-left font-mono">
                <span>טל': 02-5012401</span>
                <span className="mx-1.5">|</span>
                <span>שער הממשלה: www.gov.il</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button Bar */}
        <div className="space-y-3">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
                <span className="font-semibold">{successMessage}</span>
              </div>
              {isEmbeddedInPortal && onNavigateNext && nextDocTypeId && (
                <button
                  type="button"
                  onClick={onNavigateNext}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                >
                  <span>המשך לטופס הבא</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            {!isEmbeddedInPortal ? (
              <Link
                href={`/vendor/candidate/${candidate.candidate_id}`}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition text-center"
              >
                ביטול וחזרה
              </Link>
            ) : (
              <div className="text-xs text-slate-500">
                לאחר החתימה יופק קובץ PDF חתום ויישמר בתיקיית ה-Google Drive
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              {successMessage && isEmbeddedInPortal && onNavigateNext && nextDocTypeId && (
                <button
                  type="button"
                  onClick={onNavigateNext}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition"
                >
                  <span>המשך לטופס הבא</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !signatureDataUrl}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>מפיק קובץ PDF ושומר ב-Google Drive...</span>
                  </>
                ) : successMessage ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>נשמר בהצלחה ב-Drive!</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {isEmbeddedInPortal && nextDocTypeId
                        ? "שמור, חתום והמשך לטופס הבא"
                        : `שמור וחתום על ${docInfo.name}`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

// -------------------------------------------------------------
// Component: Generic Clauses Renderer for Declarations
// -------------------------------------------------------------
function DocClausesOnly({
  docInfo,
  candidate,
}: {
  docInfo: FullDocumentInfo;
  candidate?: CandidateData;
}) {
  return (
    <div className="pdf-section space-y-4 text-sm leading-relaxed border border-slate-200 rounded-xl p-6 bg-slate-50/40" data-pdf-section="clauses">
      <h3 className="font-bold text-slate-900 text-base border-b pb-2">
        סעיפי ההצהרה והתנאים
      </h3>
      <div className="space-y-3 text-slate-700 text-xs sm:text-sm">
        {docInfo.fullContent.map((clause, idx) => (
          <p key={idx} className="pdf-section leading-relaxed" data-pdf-section={`clause-${idx}`}>
            {clause}
          </p>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Form 1: Personal Questionnaire Level 5
// -------------------------------------------------------------
function Doc1PersonalQuestionnaire({
  birthDate,
  setBirthDate,
  birthCountry,
  setBirthCountry,
  aliyahYear,
  setAliyahYear,
  maritalStatus,
  setMaritalStatus,
  otherCitizenship,
  setOtherCitizenship,
  address,
  setAddress,
  armyService,
  setArmyService,
  militaryId,
  setMilitaryId,
  militaryRole,
  setMilitaryRole,
  militaryYears,
  setMilitaryYears,
  exemptionReason,
  setExemptionReason,
  educationHigh,
  setEducationHigh,
  educationAcademic,
  setEducationAcademic,
  workplace1,
  setWorkplace1,
  workplace2,
  setWorkplace2,
  ref1,
  setRef1,
  ref2,
  setRef2,
  docInfo,
}: any) {
  return (
    <div className="space-y-6">
      {/* Questionnaire Instructions & Legal Clauses */}
      <div className="pdf-section bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-2 text-xs text-blue-900" data-pdf-section="instructions">
        <h4 className="font-bold text-sm text-blue-950">הוראות מילוי והצהרה:</h4>
        {docInfo.fullContent.map((clause: string, i: number) => (
          <p key={i} className="leading-relaxed">
            {clause}
          </p>
        ))}
      </div>

      {/* Section 1: Personal Details */}
      <div className="pdf-section border border-slate-200 rounded-xl p-5 space-y-4" data-pdf-section="part-a">
        <h3 className="font-bold text-slate-900 text-base border-b pb-2">
          חלק א': פרטים אישיים
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-semibold block mb-1">תאריך לידה:</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
              required
            />
          </div>
          <div>
            <label className="font-semibold block mb-1">ארץ לידה:</label>
            <input
              type="text"
              value={birthCountry}
              onChange={(e) => setBirthCountry(e.target.value)}
              placeholder="למשל: ישראל"
              className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
              required
            />
          </div>
          <div>
            <label className="font-semibold block mb-1">שנת עלייה (אם רלוונטי):</label>
            <input
              type="text"
              value={aliyahYear}
              onChange={(e) => setAliyahYear(e.target.value)}
              placeholder="שנה או ציין 'יליד הארץ'"
              className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
            />
          </div>
          <div>
            <label className="font-semibold block mb-1">מצב משפחתי:</label>
            <select
              value={maritalStatus}
              onChange={(e) => setMaritalStatus(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
            >
              <option value="רווק/ה">רווק/ה</option>
              <option value="נשוי/ה">נשוי/ה</option>
              <option value="גרוש/ה">גרוש/ה</option>
              <option value="אלמן/ה">אלמן/ה</option>
            </select>
          </div>
          <div>
            <label className="font-semibold block mb-1">אזרחויות נוספות:</label>
            <input
              type="text"
              value={otherCitizenship}
              onChange={(e) => setOtherCitizenship(e.target.value)}
              placeholder="אם אין ציין 'אין'"
              className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="font-semibold block mb-1">כתובת מגורים מלאה (עיר, רחוב, בית):</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="למשל: תל אביב, רחוב ויצמן 12"
              className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
              required
            />
          </div>
        </div>
      </div>

      {/* Section 2: Military / National Service */}
      <div className="pdf-section border border-slate-200 rounded-xl p-5 space-y-4" data-pdf-section="part-b">
        <h3 className="font-bold text-slate-900 text-base border-b pb-2">
          חלק ב': שירות צבאי / לאומי / פטור
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold block mb-1">סוג שירות:</label>
            <select
              value={armyService}
              onChange={(e) => setArmyService(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
            >
              <option value={'שירות מלא בצה"ל'}>{'שירות מלא בצה"ל'}</option>
              <option value="שירות לאומי/אזרחי">שירות לאומי / אזרחי</option>
              <option value="פטור משירות">פטור משירות</option>
              <option value="שירות קבע">שירות קבע</option>
            </select>
          </div>
          <div>
            <label className="font-semibold block mb-1">מספר אישי / תעודת פטור:</label>
            <input
              type="text"
              value={militaryId}
              onChange={(e) => setMilitaryId(e.target.value)}
              placeholder="מספר אישי או מספר תעודה"
              className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
            />
          </div>
          <div>
            <label className="font-semibold block mb-1">תפקיד / מקצוע צבאי:</label>
            <input
              type="text"
              value={militaryRole}
              onChange={(e) => setMilitaryRole(e.target.value)}
              placeholder="תפקיד עיקרי"
              className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
            />
          </div>
          <div>
            <label className="font-semibold block mb-1">שנות שירות (מ- עד):</label>
            <input
              type="text"
              value={militaryYears}
              onChange={(e) => setMilitaryYears(e.target.value)}
              placeholder="למשל: 2018 - 2021"
              className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
            />
          </div>
          {armyService === "פטור משירות" && (
            <div className="sm:col-span-2">
              <label className="font-semibold block mb-1">פירוט סיבת הפטור:</label>
              <input
                type="text"
                value={exemptionReason}
                onChange={(e) => setExemptionReason(e.target.value)}
                placeholder="סיבת פטור (רפואי / גיל / אחר)"
                className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
              />
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Education */}
      <div className="pdf-section border border-slate-200 rounded-xl p-5 space-y-4" data-pdf-section="part-c">
        <h3 className="font-bold text-slate-900 text-base border-b pb-2">
          חלק ג': השכלה והכשרה מקצועית
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold block mb-1">השכלה תיכונית (שם בית ספר, עיר, שנת סיום):</label>
            <input
              type="text"
              value={educationHigh}
              onChange={(e) => setEducationHigh(e.target.value)}
              placeholder="שם בית ספר ושנת סיום"
              className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
            />
          </div>
          <div>
            <label className="font-semibold block mb-1">השכלה אקדמית / תעודה / קורסים:</label>
            <input
              type="text"
              value={educationAcademic}
              onChange={(e) => setEducationAcademic(e.target.value)}
              placeholder="מוסד, תחום לימודים, תואר"
              className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
            />
          </div>
        </div>
      </div>

      {/* Section 4: Employment History */}
      <div className="pdf-section border border-slate-200 rounded-xl p-5 space-y-4" data-pdf-section="part-d">
        <h3 className="font-bold text-slate-900 text-base border-b pb-2">
          חלק ד': תעסוקה ב-5 השנים האחרונות
        </h3>
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-semibold block mb-1">מקום עבודה אחרון (מעסיק, תפקיד, תקופה):</label>
            <input
              type="text"
              value={workplace1}
              onChange={(e) => setWorkplace1(e.target.value)}
              placeholder="שם מעסיק, תפקיד, שנות העסקה"
              className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
            />
          </div>
          <div>
            <label className="font-semibold block mb-1">מקום עבודה קודם (מעסיק, תפקיד, תקופה):</label>
            <input
              type="text"
              value={workplace2}
              onChange={(e) => setWorkplace2(e.target.value)}
              placeholder="שם מעסיק, תפקיד, שנות העסקה"
              className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
            />
          </div>
        </div>
      </div>

      {/* Section 5: References */}
      <div className="pdf-section border border-slate-200 rounded-xl p-5 space-y-4" data-pdf-section="part-e">
        <h3 className="font-bold text-slate-900 text-base border-b pb-2">
          חלק ה': ממליצים (מכירים לפחות 3 שנים, לא בני משפחה)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold block mb-1">ממליץ 1 (שם מלא, טלפון, מהות היכרות):</label>
            <input
              type="text"
              value={ref1}
              onChange={(e) => setRef1(e.target.value)}
              placeholder="שם, טלפון, מקום עבודה"
              className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
              required
            />
          </div>
          <div>
            <label className="font-semibold block mb-1">ממליץ 2 (שם מלא, טלפון, מהות היכרות):</label>
            <input
              type="text"
              value={ref2}
              onChange={(e) => setRef2(e.target.value)}
              placeholder="שם, טלפון, מקום עבודה"
              className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
              required
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Form 4: Criminal Record Consent
// -------------------------------------------------------------
function Doc4CriminalRecordConsent({
  candidate,
  fatherName,
  setFatherName,
  address,
  setAddress,
  docInfo,
}: any) {
  return (
    <div className="pdf-section space-y-4 text-sm leading-relaxed border border-slate-200 rounded-xl p-6 bg-slate-50/40" data-pdf-section="consent-form">
      <h3 className="font-bold text-slate-900 text-base border-b pb-2">
        כתב הסכמה למסירת מידע מן המרשם הפלילי (ויתור סודיות)
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pb-3 border-b">
        <div>
          <label className="font-semibold block mb-1">שם האב:</label>
          <input
            type="text"
            value={fatherName}
            onChange={(e) => setFatherName(e.target.value)}
            placeholder="שם פרטי של האב"
            className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
            required
          />
        </div>
        <div>
          <label className="font-semibold block mb-1">כתובת מגורים עדכנית:</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="עיר, רחוב ומספר בית"
            className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
            required
          />
        </div>
      </div>
      <div className="space-y-3 text-slate-700 text-xs sm:text-sm pt-2">
        {docInfo.fullContent.map((clause: string, i: number) => (
          <p key={i} className="leading-relaxed">
            {clause}
          </p>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Form 9: Smart Card Request Form (Faithful to הנפקת כרטיס.docx)
// -------------------------------------------------------------
function Doc9SmartCardRequest({
  candidate,
  nameEn,
  setNameEn,
  roleInProject,
  setRoleInProject,
  managerName,
  setManagerName,
  startDate,
  setStartDate,
  previousGov,
  setPreviousGov,
  previousDates,
  setPreviousDates,
  docInfo,
}: any) {
  return (
    <div className="space-y-6 text-sm text-slate-900">
      {/* Notice header */}
      <div className="text-xs text-slate-600 font-semibold italic border-b pb-2">
        * יש למלא את הטופס בכתב ברור וקריא.
      </div>

      {/* Underlined fields table/rows matching original document */}
      <div className="pdf-section space-y-4 bg-slate-50/60 p-6 rounded-2xl border border-slate-200" data-pdf-section="fields-table">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">שם פרטי ומשפחה:</label>
            <div className="p-2.5 bg-white border-b-2 border-slate-400 font-bold text-slate-900 rounded-t">
              {candidate.full_name}
            </div>
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">שם פרטי ומשפחה באנגלית:</label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="Full Name in English"
              dir="ltr"
              className="w-full border-b-2 border-slate-400 p-2.5 text-xs bg-white focus:outline-hidden font-medium rounded-t"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">מספר תעודת זהות:</label>
            <div className="p-2.5 bg-white border-b-2 border-slate-400 font-mono font-bold text-slate-900 rounded-t">
              {candidate.id_number}
            </div>
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">תפקיד מיועד:</label>
            <input
              type="text"
              value={roleInProject}
              onChange={(e) => setRoleInProject(e.target.value)}
              placeholder="למשל: מהנדס מערכות / מפתח תוכנה"
              className="w-full border-b-2 border-slate-400 p-2.5 text-xs bg-white focus:outline-hidden font-medium rounded-t"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">דואר אלקטרוני:</label>
            <div className="p-2.5 bg-white border-b-2 border-slate-400 font-mono text-slate-900 rounded-t">
              {candidate.email}
            </div>
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">סוג העסקה:</label>
            <div className="p-2.5 bg-white border-b-2 border-slate-400 font-semibold text-slate-800 rounded-t">
              עובד קבלן / מיקור חוץ ({candidate.vendor_company_name || candidate.vendor_id})
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">תאריך תחילת העסקה:</label>
            <input
              type="text"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border-b-2 border-slate-400 p-2.5 text-xs bg-white focus:outline-hidden font-medium rounded-t"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">העסקה במשרד ממשלתי קודם (כן/לא ותאריכים):</label>
            <div className="flex gap-2">
              <select
                value={previousGov}
                onChange={(e) => setPreviousGov(e.target.value)}
                className="border-b-2 border-slate-400 p-2 text-xs bg-white focus:outline-hidden font-semibold rounded-t"
              >
                <option value="לא">לא</option>
                <option value="כן">כן</option>
              </select>
              {previousGov === "כן" && (
                <input
                  type="text"
                  value={previousDates}
                  onChange={(e) => setPreviousDates(e.target.value)}
                  placeholder="ציין משרד ושנים"
                  className="flex-1 border-b-2 border-slate-400 p-2 text-xs bg-white focus:outline-hidden rounded-t"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Declaration Section */}
      <div className="pdf-section border border-slate-200 rounded-xl p-5 bg-white space-y-2" data-pdf-section="candidate-decl">
        <h4 className="font-black text-sm text-slate-900 border-b pb-1">
          הצהרת מבקש/ת התעודה
        </h4>
        <p className="text-xs text-slate-700 leading-relaxed">
          הנני מאשר/ת בזאת שכל הפרטים שמסרתי נכונים.
        </p>
        <p className="text-xs text-slate-700 leading-relaxed">
          אני מאשר/ת בזאת את מסירת המידע הנ"ל למרכז להנפקת התעודות, לצורך הנפקת תעודה עבורי.
        </p>
        <div className="pt-2 text-xs text-slate-500 font-medium">
          חתימת העובד/ת תוטמע להלן באמצעות משטח החתימה האלקטרוני.
        </div>
      </div>

      {/* Unit Representative Declaration Section */}
      <div className="pdf-section border border-slate-200 rounded-xl p-5 bg-white space-y-3" data-pdf-section="rep-decl">
        <h4 className="font-black text-sm text-slate-900 border-b pb-1">
          הצהרת נציג היחידה / מנהל פרויקט
        </h4>
        <p className="text-xs text-slate-700 leading-relaxed">
          הנני מאשר/ת שמר/גב' <strong>{candidate.full_name}</strong> מס' תעודת זהות <strong>{candidate.id_number}</strong> חתם בנוכחותי על טופס הבקשה לתעודה. הפרטים אומתו וזיהיתי את המבקש.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
          <div>
            <label className="font-semibold block mb-1">שם מנהל מאשר:</label>
            <input
              type="text"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              placeholder="שם מנהל/ת ישיר"
              className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white"
            />
          </div>
          <div>
            <label className="font-semibold block mb-1">תפקיד מנהל מאשר:</label>
            <input
              type="text"
              defaultValue="מנהל פרויקט / מוביל צוות"
              className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white"
            />
          </div>
        </div>
      </div>

      {/* Original Instructions Box */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs text-amber-950 space-y-2">
        <h5 className="font-bold text-amber-900">הנחיות הגעה ואישור רשמיות:</h5>
        <ul className="list-disc list-inside space-y-1 text-slate-700">
          <li>
            יש להגיע עם טופס זה לגב' עופרה אפרים באגף משאבי אנוש, כדי להצטלם עבור הכרטיס חכם, ולאחר החתמת הטופס ע"י מר אריה בייגן באגף המיכון, במשרד האוצר הראשי.
          </li>
          <li>
            יש להגיע לאחר תיאום טלפוני מראש בלבד!
          </li>
          <li>
            עופרה אפרים: 5317769 / 5317430 (קומת כניסה)
          </li>
          <li>
            אריה בייגן: 5317605 (קומה 4)
          </li>
          <li>
            במקרים חריגים בהם עופרה איננה ניתן לפנות לגב' מירב לוי חסון: 5317879, בתיאום מראש.
          </li>
        </ul>
      </div>
    </div>
  );
}
