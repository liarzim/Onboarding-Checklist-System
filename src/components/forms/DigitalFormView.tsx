"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Shield,
  Building,
  User,
  Calendar,
  Phone,
  Mail,
  CreditCard,
  Briefcase,
  Lock,
} from "lucide-react";
import SignaturePad from "./SignaturePad";
import { generatePdfFromElement } from "@/lib/forms/pdfGenerator";
import { FORM_METADATA_LIST } from "@/lib/forms/formDefinitions";

interface CandidateData {
  candidate_id: string;
  full_name: string;
  id_number: string;
  email: string;
  phone: string;
  vendor_id: string;
  project_id: string;
  vendor_company_name?: string;
}

interface DigitalFormViewProps {
  docTypeId: string;
  candidate: CandidateData;
}

export default function DigitalFormView({
  docTypeId,
  candidate,
}: DigitalFormViewProps) {
  const router = useRouter();
  const printRef = useRef<HTMLDivElement | null>(null);

  const meta = FORM_METADATA_LIST[docTypeId] || {
    docTypeId,
    title: "טופס קליטה מקוון",
    subtitle: "מסמך רשמי לקליטת עובד/ספק",
    category: "security",
  };

  const todayStr = new Date().toLocaleDateString("he-IL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // Common and document-specific form state
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // doc_1 (Personal Questionnaire Level 5) specific fields
  const [q1BirthDate, setQ1BirthDate] = useState("");
  const [q1BirthCountry, setQ1BirthCountry] = useState("ישראל");
  const [q1AliyahYear, setQ1AliyahYear] = useState("");
  const [q1MaritalStatus, setQ1MaritalStatus] = useState("רווק/ה");
  const [q1OtherCitizenship, setQ1OtherCitizenship] = useState("אין");
  const [q1Address, setQ1Address] = useState("");
  const [q1ArmyService, setQ1ArmyService] = useState("שירות מלא בצה\"ל");
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

  // doc_4 (Criminal Consent) specific fields
  const [q4FatherName, setQ4FatherName] = useState("");
  const [q4Address, setQ4Address] = useState("");

  // doc_9 (Smart Card Request) specific fields
  const [q9RoleInProject, setQ9RoleInProject] = useState("");
  const [q9ManagerName, setQ9ManagerName] = useState("");
  const [q9AccessLevel, setQ9AccessLevel] = useState("רמת גישה 2 - מתחם משרדים ומעבדות");
  const [q9AccessSites, setQ9AccessSites] = useState("קמפוס מרכזי, בניין פיתוח");

  // Universal acknowledgement checkbox
  const [agreeTerms, setAgreeTerms] = useState(true);

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

      // 1. Generate formatted PDF File directly from the rendered form DOM
      const targetFileName = `${meta.title}.${candidate.full_name}.pdf`;
      const pdfFile = await generatePdfFromElement(printRef.current, targetFileName);

      // 2. Prepare FormData for /api/documents/upload
      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append("candidate_id", candidate.candidate_id);
      formData.append("doc_type_id", docTypeId);

      // 3. Post to the documents upload API
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "שגיאה בשמירת המסמך והעלאתו ל-Drive");
      }

      setSuccessMessage("הטופס נחתם, הופק ל-PDF ונשמר בהצלחה ב-Google Drive!");

      // Navigate back to checklist after short pause
      setTimeout(() => {
        router.push(`/vendor/candidate/${candidate.candidate_id}`);
      }, 1500);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "שגיאה בלתי צפויה בהעלאת הטופס"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Navigation Bar */}
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
          <span>{meta.title}</span>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Printable Form Container - Captured by html2canvas */}
        <div
          ref={printRef}
          className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-sm space-y-8 text-slate-900"
          dir="rtl"
        >
          {/* Formal Document Header */}
          <div className="border-b-2 border-slate-900 pb-6 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold uppercase tracking-wider text-slate-700">
                מערכת קליטה ואבטחת מידע - טופס רשמי
              </span>
              <span>תאריך מילוי: {todayStr}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold">
                <FileCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900">{meta.title}</h1>
                <p className="text-sm text-slate-600 font-medium">{meta.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Candidate Profile Details Summary Box */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3">
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

          {/* Document Content - Switch based on docTypeId */}
          {docTypeId === "doc_1" && (
            <Doc1PersonalQuestionnaire
              candidate={candidate}
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
            />
          )}

          {docTypeId === "doc_2" && <Doc2ExamineeLeaflet />}

          {docTypeId === "doc_3" && <Doc3SmartCardReceipt candidate={candidate} />}

          {docTypeId === "doc_4" && (
            <Doc4CriminalRecordConsent
              candidate={candidate}
              fatherName={q4FatherName}
              setFatherName={setQ4FatherName}
              address={q4Address}
              setAddress={setQ4Address}
            />
          )}

          {docTypeId === "doc_5" && <Doc5ConfidentialityNDA candidate={candidate} />}

          {docTypeId === "doc_6" && <Doc6PrivacyUndertaking candidate={candidate} />}

          {docTypeId === "doc_7" && <Doc7ComputerCrimes candidate={candidate} />}

          {docTypeId === "doc_8" && <Doc8CyberMonitoring candidate={candidate} />}

          {docTypeId === "doc_9" && (
            <Doc9SmartCardRequest
              candidate={candidate}
              roleInProject={q9RoleInProject}
              setRoleInProject={setQ9RoleInProject}
              managerName={q9ManagerName}
              setManagerName={setQ9ManagerName}
              accessLevel={q9AccessLevel}
              setAccessLevel={setQ9AccessLevel}
              accessSites={q9AccessSites}
              setAccessSites={setQ9AccessSites}
            />
          )}

          {/* Legal Acknowledgement Checkbox */}
          <div className="pt-4 border-t border-slate-200">
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
          <div className="pt-2">
            <SignaturePad
              onSignatureChange={setSignatureDataUrl}
              signerName={candidate.full_name}
            />
          </div>

          {/* Document Footer with Timestamp & Verification Stamp */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
            <span>מזהה מועמד: {candidate.candidate_id}</span>
            <span>מזהה מסמך: {docTypeId}</span>
            <span>מסמך דיגיטלי מאובטח</span>
          </div>
        </div>

        {/* Action Button Bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href={`/vendor/candidate/${candidate.candidate_id}`}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition text-center"
          >
            ביטול וחזרה
          </Link>

          <button
            type="submit"
            disabled={isSubmitting || !signatureDataUrl}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>מפיק קובץ PDF ושומר ב-Drive...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>שמור ושלח טופס חתום</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// -------------------------------------------------------------
// Form 1: Personal Questionnaire Level 5
// -------------------------------------------------------------
function Doc1PersonalQuestionnaire({
  candidate,
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
}: any) {
  return (
    <div className="space-y-6">
      {/* Section 1: Personal Details */}
      <div className="border border-slate-200 rounded-xl p-5 space-y-4">
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
              className="w-full border border-slate-300 rounded-lg p-2 text-sm"
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
              className="w-full border border-slate-300 rounded-lg p-2 text-sm"
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
              className="w-full border border-slate-300 rounded-lg p-2 text-sm"
            />
          </div>
          <div>
            <label className="font-semibold block mb-1">מצב משפחתי:</label>
            <select
              value={maritalStatus}
              onChange={(e) => setMaritalStatus(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-sm"
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
              className="w-full border border-slate-300 rounded-lg p-2 text-sm"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="font-semibold block mb-1">כתובת מגורים מלאה (עיר, רחוב, בית):</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="למשל: תל אביב, רחוב ויצמן 12"
              className="w-full border border-slate-300 rounded-lg p-2 text-sm"
              required
            />
          </div>
        </div>
      </div>

      {/* Section 2: Military / National Service */}
      <div className="border border-slate-200 rounded-xl p-5 space-y-4">
        <h3 className="font-bold text-slate-900 text-base border-b pb-2">
          חלק ב': שירות צבאי / לאומי / פטור
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold block mb-1">סוג שירות:</label>
            <select
              value={armyService}
              onChange={(e) => setArmyService(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-sm"
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
              className="w-full border border-slate-300 rounded-lg p-2 text-sm"
            />
          </div>
          <div>
            <label className="font-semibold block mb-1">תפקיד / מקצוע צבאי:</label>
            <input
              type="text"
              value={militaryRole}
              onChange={(e) => setMilitaryRole(e.target.value)}
              placeholder="תפקיד עיקרי"
              className="w-full border border-slate-300 rounded-lg p-2 text-sm"
            />
          </div>
          <div>
            <label className="font-semibold block mb-1">שנות שירות (מ- עד):</label>
            <input
              type="text"
              value={militaryYears}
              onChange={(e) => setMilitaryYears(e.target.value)}
              placeholder="למשל: 2018 - 2021"
              className="w-full border border-slate-300 rounded-lg p-2 text-sm"
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
                className="w-full border border-slate-300 rounded-lg p-2 text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Education */}
      <div className="border border-slate-200 rounded-xl p-5 space-y-4">
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
              className="w-full border border-slate-300 rounded-lg p-2 text-sm"
            />
          </div>
          <div>
            <label className="font-semibold block mb-1">השכלה אקדמית / תעודה / קורסים:</label>
            <input
              type="text"
              value={educationAcademic}
              onChange={(e) => setEducationAcademic(e.target.value)}
              placeholder="מוסד, תחום לימודים, תואר"
              className="w-full border border-slate-300 rounded-lg p-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Section 4: Employment History */}
      <div className="border border-slate-200 rounded-xl p-5 space-y-4">
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
              className="w-full border border-slate-300 rounded-lg p-2 text-sm"
            />
          </div>
          <div>
            <label className="font-semibold block mb-1">מקום עבודה קודם (מעסיק, תפקיד, תקופה):</label>
            <input
              type="text"
              value={workplace2}
              onChange={(e) => setWorkplace2(e.target.value)}
              placeholder="שם מעסיק, תפקיד, שנות העסקה"
              className="w-full border border-slate-300 rounded-lg p-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Section 5: References */}
      <div className="border border-slate-200 rounded-xl p-5 space-y-4">
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
              className="w-full border border-slate-300 rounded-lg p-2 text-sm"
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
              className="w-full border border-slate-300 rounded-lg p-2 text-sm"
              required
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Form 2: Examinee Leaflet
// -------------------------------------------------------------
function Doc2ExamineeLeaflet() {
  return (
    <div className="space-y-4 text-sm leading-relaxed border border-slate-200 rounded-xl p-6 bg-slate-50/40">
      <h3 className="font-bold text-slate-900 text-base border-b pb-2">
        עלון מידע והסבר לנבדק בהליך בדיקת התאמה ביטחונית
      </h3>
      <div className="space-y-3 text-slate-700 text-xs sm:text-sm">
        <p>
          <strong>1. מטרת ההליך:</strong> בדיקת ההתאמה הביטחונית נועדה לוודא את התאמת המועמד/ת לעבודה בסביבה
          מסווגת, לשמירה על נכסים חיוניים, ולמניעת חשיפת מידע בעל רגישות ביטחונית או טכנולוגית לגורמים בלתי מורשים.
        </p>
        <p>
          <strong>2. עקרונות הבדיקה:</strong> הבדיקה נערכת בהתאם לחוק, להנחיות הגורם המוסמך, ותוך שמירה מרבית
          על כבוד האדם, פרטיותו והגינות ההליך. הנתונים שנמסרים ישמשו אך ורק לצורכי קביעת ההתאמה הביטחונית.
        </p>
        <p>
          <strong>3. זכויות הנבדק/ת:</strong> זכותך לקבל הסבר על שלבי ההליך. זכותך להודיע בכל עת על רצונך
          להפסיק את התהליך (ביטול מועמדות). זכותך לעיין בנתונים שמסרת ולבקש תיקון אם נפלה בהם טעות.
        </p>
        <p>
          <strong>4. חובת מהימנות:</strong> הצלחת הבדיקה מבוססת על אמירת אמת ושיתוף פעולה מלא. מסירת מידע כוזב,
          חלקי או מטעה עלולה להוביל לפסילת המועמדות באופן מיידי.
        </p>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Form 3: Smart Card Receipt Declaration
// -------------------------------------------------------------
function Doc3SmartCardReceipt({ candidate }: { candidate: CandidateData }) {
  return (
    <div className="space-y-4 text-sm leading-relaxed border border-slate-200 rounded-xl p-6 bg-slate-50/40">
      <h3 className="font-bold text-slate-900 text-base border-b pb-2">
        הצהרת קבלת כרטיס חכם והתחייבות לשימוש נאות
      </h3>
      <div className="space-y-3 text-slate-700 text-xs sm:text-sm">
        <p>
          1. הנני מאשר/ת בזאת כי קיבלתי לידיי כרטיס חכם (תג זיהוי אלקטרוני) המיועד לצורך גישה למתקנים, עמדות
          ומערכות המידע המורשות במסגרת הפרויקט <strong>{candidate.project_id}</strong>.
        </p>
        <p>
          2. ידוע לי כי הכרטיס הינו אישי וסודי. הנני מתחייב/ת שלא להעביר, להשאיל, לשכפל או לאפשר שימוש בכרטיס
          על ידי אדם אחר, לרבות עובדים או ממונים.
        </p>
        <p>
          3. הנני מתחייב/ת לנקוט בכל אמצעי הזהירות הדרושים לשמירה פיזית ומערכתית על הכרטיס, ולמנוע את אובדנו, גניבתו
          או פגיעתו.
        </p>
        <p>
          4. במקרה של אובדן, גניבה או תקלה בכרטיס, הנני מתחייב/ת לדווח מיידית לקצין הביטחון ולמנהל הפרויקט.
        </p>
        <p>
          5. עם סיום עבודתי בפרויקט או בהתאם לדרישה ראשונה, אחזיר את הכרטיס לידי הגורם המוסמך ללא שיהוי.
        </p>
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
}: any) {
  return (
    <div className="space-y-4 text-sm leading-relaxed border border-slate-200 rounded-xl p-6 bg-slate-50/40">
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
        <p>
          בהתאם לחוק המידע הפלילי ותקנת השבים, התשע"ט-2019, הנני נותן/ת בזאת את הסכמתי המפורשת והבלתי חוזרת
          למשטרת ישראל למסור לידי הגורם המוסמך בארגון מידע מן המרשם הפלילי ורישום משטרתי הנוגע אליי, ככל שנדרש
          לצורך בדיקת התאמתי לתפקיד בפרויקט <strong>{candidate.project_id}</strong>.
        </p>
        <p>
          הסכמה זו ניתנת מרצוני החופשי, וידוע לי כי המידע יישמר בסודיות מוחלטת וישמש אך ורק לצורך בדיקה זו.
        </p>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Form 5: Confidentiality Agreement (NDA)
// -------------------------------------------------------------
function Doc5ConfidentialityNDA({ candidate }: { candidate: CandidateData }) {
  return (
    <div className="space-y-4 text-sm leading-relaxed border border-slate-200 rounded-xl p-6 bg-slate-50/40">
      <h3 className="font-bold text-slate-900 text-base border-b pb-2">
        התחייבות לשמירת סודיות ואי גילוי מידע (NDA)
      </h3>
      <div className="space-y-3 text-slate-700 text-xs sm:text-sm">
        <p>
          1. <strong>הגדרת מידע סודי:</strong> כל מידע בעל אופי טכנולוגי, הנדסי, ביטחוני, תפעולי, מסחרי או ארגוני,
          לרבות קוד מקור, מפרטים, תוכניות עבודה, נתוני לקוחות ומידע סודי של מדינת ישראל והפרויקט אשר יגיע לידיעתי.
        </p>
        <p>
          2. <strong>חובת סודיות:</strong> הנני מתחייב/ת לשמור על המידע הסודי בסודיות מוחלטת, לא לגלותו, לא למסרו ולא
          להעבירו לצד שלישי כלשהו, בין במישרין ובין בעקיפין.
        </p>
        <p>
          3. <strong>איסור הוצאת חומרים:</strong> הנני מתחייב/ת שלא להוציא חומרים, קבצים, שרטוטים, קוד או מדיה
          מחוץ למתקני הפרויקט ללא אישור מפורש ומראש בכתב ממנהל הביטחון.
        </p>
        <p>
          4. <strong>תוקף ההתחייבות:</strong> התחייבותי זו הינה ללא הגבלת זמן ותעמוד בתוקפה המלא גם לאחר סיום עבודתי
          בפרויקט או סיום ההתקשרות עם חברת <strong>{candidate.vendor_company_name || candidate.vendor_id}</strong>.
        </p>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Form 6: Privacy Protection Undertaking
// -------------------------------------------------------------
function Doc6PrivacyUndertaking({ candidate }: { candidate: CandidateData }) {
  return (
    <div className="space-y-4 text-sm leading-relaxed border border-slate-200 rounded-xl p-6 bg-slate-50/40">
      <h3 className="font-bold text-slate-900 text-base border-b pb-2">
        התחייבות לעמידה בהוראות חוק הגנת הפרטיות
      </h3>
      <div className="space-y-3 text-slate-700 text-xs sm:text-sm">
        <p>
          1. הנני מצהיר/ה כי ידועים לי עקרונות חוק הגנת הפרטיות, התשמ"א-1981 ותקנות הגנת הפרטיות (אבטחת מידע),
          התשע"ז-2017.
        </p>
        <p>
          2. הנני מתחייב/ת לשמור בסודיות מלאה כל מידע אישי, פרטי, רפואי או רגיש אליו איחשף במסגרת ביצוע עבודתי
          בפרויקט <strong>{candidate.project_id}</strong>.
        </p>
        <p>
          3. לא אעשה כל שימוש במידע אישי ממאגרי המידע אלא אך ורק למטרה שלשמה נמסר המידע ובמסגרת סמכויותיי המוגדרות.
        </p>
        <p>
          4. במקרה של חשש לפגיעה בפרטיות, חשיפה בלתי מורשית או דלף מידע, אדווח מיד לממונה על הגנת הפרטיות ולאחראי
          האבטחה.
        </p>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Form 7: Computer Crimes Prevention
// -------------------------------------------------------------
function Doc7ComputerCrimes({ candidate }: { candidate: CandidateData }) {
  return (
    <div className="space-y-4 text-sm leading-relaxed border border-slate-200 rounded-xl p-6 bg-slate-50/40">
      <h3 className="font-bold text-slate-900 text-base border-b pb-2">
        התחייבות להימנעות מעבירות מחשב (חוק המחשבים, התשנ"ה-1995)
      </h3>
      <div className="space-y-3 text-slate-700 text-xs sm:text-sm">
        <p>
          1. הנני מתחייב/ת שלא לחדור שלא כדין לחומר מחשב, לא לבצע פעולות שיבוש בפעולת מחשב, ולא למחוק או לשנות
          מידע ללא הרשאה מפורשת.
        </p>
        <p>
          2. הנני מתחייב/ת שלא לחבר למערכות המחשב או לרשת הארגונית התקני זיכרון ניידים (DOK / USB), טלפונים ניידים
          או כל ציוד היקפי אחר שלא אושר בכתב על ידי אבטחת מידע.
        </p>
        <p>
          3. לא אתקין, לא אוריד ולא אריץ תוכנות, סקריפטים או כלי פריצה/בדיקה ללא אישור מראש.
        </p>
        <p>
          4. ידוע לי כי הפרת הוראות אלו מהווה עבירה פלילית על פי חוק המחשבים, מעבר לעילות פיטורין ונקיטת צעדים
          משמעתיים.
        </p>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Form 8: Cyber Monitoring Consent
// -------------------------------------------------------------
function Doc8CyberMonitoring({ candidate }: { candidate: CandidateData }) {
  return (
    <div className="space-y-4 text-sm leading-relaxed border border-slate-200 rounded-xl p-6 bg-slate-50/40">
      <h3 className="font-bold text-slate-900 text-base border-b pb-2">
        כתב הסכמה מדעת לביצוע ניטור, בקרה והגנת סייבר
      </h3>
      <div className="space-y-3 text-slate-700 text-xs sm:text-sm">
        <p>
          1. הובא לידיעתי כי לצורך הבטחת שלמות המערכות, מניעת מתקפות סייבר, הגנה מפני דלף מידע ואכיפת נהלי
          אבטחה, הארגון מפעיל אמצעי ניטור, תיעוד, סינון ובקרה על כלל תשתיות המחשוב והתקשורת.
        </p>
        <p>
          2. הנני מביע/ה את הסכמתי לכך שהתעבורה בעמדת העבודה, גלישה באינטרנט, תעבורת דוא"ל ארגוני, ושימוש ברשת
          ייבדקו ויירשמו ביומני אבטחה (Logs).
        </p>
        <p>
          3. ידוע לי כי המשאבים הממוחשבים מיועדים לצורכי עבודה בלבד ואינם מהווים מרחב פרטי.
        </p>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Form 9: Smart Card Request Form
// -------------------------------------------------------------
function Doc9SmartCardRequest({
  candidate,
  roleInProject,
  setRoleInProject,
  managerName,
  setManagerName,
  accessLevel,
  setAccessLevel,
  accessSites,
  setAccessSites,
}: any) {
  return (
    <div className="space-y-4 text-sm leading-relaxed border border-slate-200 rounded-xl p-6 bg-slate-50/40">
      <h3 className="font-bold text-slate-900 text-base border-b pb-2">
        טופס בקשה להנפקת כרטיס חכם והרשאות גישה
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="font-semibold block mb-1">תפקיד מיועד בפרויקט:</label>
          <input
            type="text"
            value={roleInProject}
            onChange={(e) => setRoleInProject(e.target.value)}
            placeholder="למשל: מפתח תוכנה בכיר / מנהל רשת"
            className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
            required
          />
        </div>
        <div>
          <label className="font-semibold block mb-1">שם מנהל פרויקט מאשר:</label>
          <input
            type="text"
            value={managerName}
            onChange={(e) => setManagerName(e.target.value)}
            placeholder="שם מנהל/ת ישיר"
            className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
            required
          />
        </div>
        <div>
          <label className="font-semibold block mb-1">רמת סיווג וגישה נדרשת:</label>
          <select
            value={accessLevel}
            onChange={(e) => setAccessLevel(e.target.value)}
            className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
          >
            <option value="רמת גישה 1 - מתחם משרדים">רמת גישה 1 - מתחם משרדים</option>
            <option value="רמת גישה 2 - מתחם משרדים ומעבדות">רמת גישה 2 - מתחם משרדים ומעבדות</option>
            <option value="רמת גישה 3 - חוות שרתים ומתקנים מוגנים">רמת גישה 3 - חוות שרתים ומתקנים מוגנים</option>
          </select>
        </div>
        <div>
          <label className="font-semibold block mb-1">אתרים ומתחמים מבוקשים לגישה:</label>
          <input
            type="text"
            value={accessSites}
            onChange={(e) => setAccessSites(e.target.value)}
            placeholder="קמפוס מרכזי, חוות שרתים וכד'"
            className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
          />
        </div>
      </div>
      <p className="text-xs text-slate-500 pt-2">
        לאחר אישור גורמי הביטחון, יונפק הכרטיס והודעה תועבר לחברת הספק ולמועמד/ת.
      </p>
    </div>
  );
}
