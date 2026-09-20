"use client";

import { useState, useMemo } from "react";
import {
  Shield,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Building,
  Briefcase,
  ChevronDown,
  ChevronUp,
  X,
  Send,
  Loader2,
  Check,
  FileCheck2,
  Info,
  ExternalLink,
} from "lucide-react";
import SignatureCanvas from "@/components/SignatureCanvas";
import { validateIsraeliId } from "@/lib/validation/israeliId";
import { DECLARATIONS_FULL_TEXT } from "@/lib/forms/declarationsFullText";

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
}

export default function CandidatePortalClient({
  candidate,
  token,
}: CandidatePortalClientProps) {
  // Form Submission Status
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Active Document Modal for "הצג נוסח מלא"
  const [activeModalId, setActiveModalId] = useState<string | null>(null);

  // Accordion Sections Open/Closed State
  const [openSections, setOpenSections] = useState<{
    sectionA: boolean;
    sectionB: boolean;
    sectionC: boolean;
    sectionD: boolean;
  }>({
    sectionA: true,
    sectionB: true,
    sectionC: true,
    sectionD: true,
  });

  // 1. Personal Details State
  const [fullName, setFullName] = useState(candidate.full_name || "");
  const [idNumber, setIdNumber] = useState(candidate.id_number || "");
  const [idValidation, setIdValidation] = useState(() =>
    validateIsraeliId(candidate.id_number || "")
  );
  const [projectName, setProjectName] = useState(candidate.project_id || "");
  const [vendorName, setVendorName] = useState(
    candidate.vendor_company_name || candidate.vendor_id || ""
  );

  function handleIdChange(e: React.ChangeEvent<HTMLInputElement>) {
    const rawVal = e.target.value;
    setIdNumber(rawVal);
    const result = validateIsraeliId(rawVal);
    setIdValidation(result);
  }

  // 2. Section A: שאלון אישי רמה 5
  const [birthDate, setBirthDate] = useState("");
  const [birthCountry, setBirthCountry] = useState("ישראל");
  const [maritalStatus, setMaritalStatus] = useState("רווק/ה");
  const [address, setAddress] = useState("");
  const [armyService, setArmyService] = useState('שירות מלא בצה"ל');
  const [militaryRole, setMilitaryRole] = useState("");
  const [ref1Name, setRef1Name] = useState("");
  const [ref1Phone, setRef1Phone] = useState("");
  const [ref2Name, setRef2Name] = useState("");
  const [ref2Phone, setRef2Phone] = useState("");

  // 3. Section B: 7 Legal Declarations Checkboxes
  const [agreedDoc2, setAgreedDoc2] = useState(false); // עלון מידע לנבדק
  const [agreedDoc3, setAgreedDoc3] = useState(false); // הצהרה על קבלת כרטיס חכם
  const [agreedDoc4, setAgreedDoc4] = useState(false); // הסכמה למסירת מידע פלילי
  const [agreedDoc5, setAgreedDoc5] = useState(false); // התחייבות לשמירת סודיות
  const [agreedDoc6, setAgreedDoc6] = useState(false); // התחייבות לשמירת פרטיות
  const [agreedDoc7, setAgreedDoc7] = useState(false); // הימנעות מעבירות מחשב
  const [agreedDoc8, setAgreedDoc8] = useState(false); // הסכמה לניטור סייבר

  // 4. Section C: בקשה להנפקת כרטיס חכם
  const [jobTitle, setJobTitle] = useState("");
  const [agreedDoc9, setAgreedDoc9] = useState(false);

  // 5. Signature & Acknowledgment
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isAcknowledged, setIsAcknowledged] = useState(false);

  // Calculate live progress out of 9 documents
  const completedCount = useMemo(() => {
    let count = 0;
    // Doc 1
    if (birthDate && address && ref1Name && ref2Name) count++;
    // Doc 2 - 8
    if (agreedDoc2) count++;
    if (agreedDoc3) count++;
    if (agreedDoc4) count++;
    if (agreedDoc5) count++;
    if (agreedDoc6) count++;
    if (agreedDoc7) count++;
    if (agreedDoc8) count++;
    // Doc 9
    if (jobTitle.trim() && agreedDoc9) count++;
    return count;
  }, [
    birthDate,
    address,
    ref1Name,
    ref2Name,
    agreedDoc2,
    agreedDoc3,
    agreedDoc4,
    agreedDoc5,
    agreedDoc6,
    agreedDoc7,
    agreedDoc8,
    jobTitle,
    agreedDoc9,
  ]);

  const progressPercent = Math.round((completedCount / 9) * 100);

  // Form submit handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    // Client-side validations
    if (!idValidation.isValid) {
      setSubmitError("נא לתקן את מספר תעודת הזהות לפני השליחה.");
      return;
    }

    if (
      !agreedDoc2 ||
      !agreedDoc3 ||
      !agreedDoc4 ||
      !agreedDoc5 ||
      !agreedDoc6 ||
      !agreedDoc7 ||
      !agreedDoc8
    ) {
      setSubmitError("יש לאשר את כל 7 הצהרות וכתבי ההסכמה בחלק ב'.");
      return;
    }

    if (!agreedDoc9 || !jobTitle.trim()) {
      setSubmitError("יש למלא תפקיד ולאשר את בקשת הנפקת כרטיס חכם בחלק ג'.");
      return;
    }

    if (!signatureDataUrl) {
      setSubmitError("חובה לחתום בחתימה דיגיטלית בתיבת החתימה.");
      return;
    }

    if (!isAcknowledged) {
      setSubmitError("חובה לסמן את תיבת האישור המשפטי לחתימה האלקטרונית.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/portal/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          candidate_id: candidate.candidate_id,
          full_name: fullName,
          id_number: idValidation.paddedId,
          project_id: projectName,
          vendor_company_name: vendorName,
          birth_date: birthDate,
          birth_country: birthCountry,
          marital_status: maritalStatus,
          address,
          army_service: armyService,
          military_role: militaryRole,
          ref1_name: ref1Name,
          ref1_phone: ref1Phone,
          ref2_name: ref2Name,
          ref2_phone: ref2Phone,
          agreed_doc_2: agreedDoc2,
          agreed_doc_3: agreedDoc3,
          agreed_doc_4: agreedDoc4,
          agreed_doc_5: agreedDoc5,
          agreed_doc_6: agreedDoc6,
          agreed_doc_7: agreedDoc7,
          agreed_doc_8: agreedDoc8,
          job_title: jobTitle,
          agreed_doc_9: agreedDoc9,
          signature_data_url: signatureDataUrl,
          is_acknowledged: isAcknowledged,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "שגיאה בשליחת הטפסים");
      }

      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "שגיאה בלתי צפויה בשליחה"
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Success Confirmation Screen
  if (isSubmitted) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-emerald-200 rounded-3xl shadow-xl text-center space-y-5" dir="rtl">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">
          הטפסים נחתמו ונשלחו בהצלחה!
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          שלום {fullName}, כל 9 טפסי הקליטה והחתימה הדיגיטלית שלך נקלטו בהצלחה
          במערכת והועברו להמשך טיפול במחלקת ביטחון שדה ומשאבי אנוש.
        </p>
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 space-y-1">
          <div>מספר מועמד: <span className="font-mono font-bold text-slate-700">{candidate.candidate_id}</span></div>
          <div>תאריך ושעת שליחה: <span className="font-semibold text-slate-700">{new Date().toLocaleString("he-IL")}</span></div>
        </div>
        <p className="text-xs text-slate-400">
          אין צורך לבצע פעולה נוספת. ניתן לסגור חלון זה.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20" dir="rtl">
      {/* Header with live Progress Indicator */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900">
                פורטל קליטת מועמד/ת
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                מילוי, אימות וחתימה אלקטרונית על 9 טפסי חובה
              </p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Phase 2
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>התקדמות מילוי ואישור:</span>
            <span className="font-mono text-blue-700 font-bold">
              השלמת {completedCount} מתוך 9 טפסים ({progressPercent}%)
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                completedCount === 9 ? "bg-emerald-500" : "bg-blue-600"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {submitError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <span className="font-medium">{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Card 1: Editable Personal Details */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-black text-base border-b pb-3">
            <User className="w-5 h-5 text-blue-600" />
            <h2>כרטיס פרטים אישיים לאימות</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                שם מלא:
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                מספר תעודת זהות ישראלית:
              </label>
              <input
                type="text"
                required
                maxLength={9}
                value={idNumber}
                onChange={handleIdChange}
                placeholder="9 ספרות"
                className={`w-full border rounded-xl p-2.5 text-sm font-mono focus:outline-none focus:ring-2 ${
                  idNumber && !idValidation.isValid
                    ? "border-rose-400 bg-rose-50/30 text-rose-900 focus:ring-rose-400"
                    : "border-slate-300 bg-slate-50/50 focus:bg-white focus:ring-blue-500"
                }`}
              />
              {/* Inline Israeli ID Luhn Validation Feedback */}
              {idNumber && !idValidation.isValid && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{idValidation.error || "תעודת זהות שגויה (ספרת ביקורת לא תואמת)"}</span>
                </p>
              )}
              {idNumber && idValidation.isValid && (
                <p className="text-[11px] text-emerald-600 mt-1 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>תעודת זהות תקינה ({idValidation.paddedId})</span>
                </p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                שם פרויקט יעד:
              </label>
              <input
                type="text"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                חברת ספק / מעסיק:
              </label>
              <input
                type="text"
                required
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Section A: שאלון אישי רמה 5 (Accordion) */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() =>
              setOpenSections((prev) => ({ ...prev, sectionA: !prev.sectionA }))
            }
            className="w-full p-5 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                A
              </div>
              <div className="text-right">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  חלק א': שאלון אישי רמה 5 (פרטים חיוניים)
                </h3>
                <span className="text-xs text-slate-500">
                  {birthDate && address && ref1Name && ref2Name
                    ? "✓ הפרטים מולאו בהצלחה"
                    : "שדות חובה למילוי"}
                </span>
              </div>
            </div>
            {openSections.sectionA ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {openSections.sectionA && (
            <div className="p-6 border-t border-slate-200 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold block mb-1">תאריך לידה:</label>
                  <input
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">ארץ לידה:</label>
                  <input
                    type="text"
                    required
                    value={birthCountry}
                    onChange={(e) => setBirthCountry(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">מצב משפחתי:</label>
                  <select
                    value={maritalStatus}
                    onChange={(e) => setMaritalStatus(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white"
                  >
                    <option value="רווק/ה">רווק/ה</option>
                    <option value="נשוי/ה">נשוי/ה</option>
                    <option value="גרוש/ה">גרוש/ה</option>
                    <option value="אלמן/ה">אלמן/ה</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">כתובת מגורים מלאה (עיר, רחוב, מספר בית):</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="למשל: תל אביב, הרצל 25"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold block mb-1">שירות צבאי / לאומי / פטור:</label>
                  <select
                    value={armyService}
                    onChange={(e) => setArmyService(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white"
                  >
                    <option value={'שירות מלא בצה"ל'}>{'שירות מלא בצה"ל'}</option>
                    <option value="שירות לאומי/אזרחי">שירות לאומי / אזרחי</option>
                    <option value="פטור משירות">פטור משירות</option>
                    <option value="שירות קבע">שירות קבע</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">תפקיד / מקצוע צבאי:</label>
                  <input
                    type="text"
                    value={militaryRole}
                    onChange={(e) => setMilitaryRole(e.target.value)}
                    placeholder="תפקיד עיקרי"
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white"
                  />
                </div>
              </div>

              {/* References */}
              <div className="pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-800 block mb-2">
                  שני ממליצים (מכירים לפחות 3 שנים, לא בני משפחה):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <span className="font-semibold text-slate-700 block">ממליץ 1:</span>
                    <input
                      type="text"
                      required
                      value={ref1Name}
                      onChange={(e) => setRef1Name(e.target.value)}
                      placeholder="שם מלא של הממליץ"
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white"
                    />
                    <input
                      type="tel"
                      required
                      value={ref1Phone}
                      onChange={(e) => setRef1Phone(e.target.value)}
                      placeholder="מספר טלפון נייד"
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white font-mono"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <span className="font-semibold text-slate-700 block">ממליץ 2:</span>
                    <input
                      type="text"
                      required
                      value={ref2Name}
                      onChange={(e) => setRef2Name(e.target.value)}
                      placeholder="שם מלא של הממליץ"
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white"
                    />
                    <input
                      type="tel"
                      required
                      value={ref2Phone}
                      onChange={(e) => setRef2Phone(e.target.value)}
                      placeholder="מספר טלפון נייד"
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card 3: Section B: הצהרות וכתבי הסכמה (Checkboxes & Full-Text Modals) */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() =>
              setOpenSections((prev) => ({ ...prev, sectionB: !prev.sectionB }))
            }
            className="w-full p-5 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                B
              </div>
              <div className="text-right">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  חלק ב': הצהרות וכתבי הסכמה (7 מסמכי חובה)
                </h3>
                <span className="text-xs text-slate-500">
                  סימון תיבות אישור ועיון בנוסח המלא
                </span>
              </div>
            </div>
            {openSections.sectionB ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {openSections.sectionB && (
            <div className="p-6 border-t border-slate-200 space-y-3.5">
              {/* Document 2: עלון מידע לנבדק */}
              <DeclarationRow
                docId="doc_2"
                title="1. עלון מידע לנבדק"
                description="אישור קריאה והבנה של תהליך הבדיקה הביטחונית, זכויותייך וסמכויות הגורם המוסמך."
                checked={agreedDoc2}
                onChange={setAgreedDoc2}
                onOpenModal={() => setActiveModalId("doc_2")}
              />

              {/* Document 3: הצהרה על קבלת כרטיס חכם */}
              <DeclarationRow
                docId="doc_3"
                title="2. הצהרה על קבלת כרטיס חכם"
                description="התחייבות לשמירה פיזית ומערכתית, איסור העברה לצד ג' והחזרה מידית בסיום ההתקשרות."
                checked={agreedDoc3}
                onChange={setAgreedDoc3}
                onOpenModal={() => setActiveModalId("doc_3")}
              />

              {/* Document 4: הסכמה למסירת מידע פלילי */}
              <DeclarationRow
                docId="doc_4"
                title="3. הסכמה למסירת מידע פלילי"
                description="מתן ייפוי כוח למשטרת ישראל למסירת מידע מן המרשם הפלילי לגורם המוסמך."
                checked={agreedDoc4}
                onChange={setAgreedDoc4}
                onOpenModal={() => setActiveModalId("doc_4")}
              />

              {/* Document 5: התחייבות לשמירת סודיות */}
              <DeclarationRow
                docId="doc_5"
                title="4. התחייבות לשמירת סודיות (NDA)"
                description="התחייבות בלתי מוגבלת בזמן לשמירת סודיות מוחלטת של מידע ביטחוני וטכנולוגי."
                checked={agreedDoc5}
                onChange={setAgreedDoc5}
                onOpenModal={() => setActiveModalId("doc_5")}
              />

              {/* Document 6: התחייבות לשמירת פרטיות */}
              <DeclarationRow
                docId="doc_6"
                title="5. התחייבות לשמירת פרטיות"
                description="עמידה בחוק הגנת הפרטיות, שמירה על מאגרי מידע ואיסור שימוש במידע אישי."
                checked={agreedDoc6}
                onChange={setAgreedDoc6}
                onOpenModal={() => setActiveModalId("doc_6")}
              />

              {/* Document 7: הימנעות מעבירות מחשב */}
              <DeclarationRow
                docId="doc_7"
                title="6. הימנעות מעבירות מחשב"
                description="התחייבות לחוק המחשבים: איסור חדירה לחומרי מחשב, אי שימוש בהתקני USB לא מאושרים."
                checked={agreedDoc7}
                onChange={setAgreedDoc7}
                onOpenModal={() => setActiveModalId("doc_7")}
              />

              {/* Document 8: הסכמה לניטור סייבר */}
              <DeclarationRow
                docId="doc_8"
                title="7. הסכמה לניטור סייבר"
                description="הסכמה מדעת לניטור תעבורת רשת, תחנות קצה ודואר אלקטרוני לצורכי אבטחת מידע והגנת סייבר."
                checked={agreedDoc8}
                onChange={setAgreedDoc8}
                onOpenModal={() => setActiveModalId("doc_8")}
              />
            </div>
          )}
        </div>

        {/* Card 4: Section C: בקשה להנפקת כרטיס חכם */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() =>
              setOpenSections((prev) => ({ ...prev, sectionC: !prev.sectionC }))
            }
            className="w-full p-5 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                C
              </div>
              <div className="text-right">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  חלק ג': בקשה להנפקת כרטיס חכם
                </h3>
                <span className="text-xs text-slate-500">
                  אישור תפקיד והגשת בקשת הגישה
                </span>
              </div>
            </div>
            {openSections.sectionC ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {openSections.sectionC && (
            <div className="p-6 border-t border-slate-200 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  תפקיד מיועד בפרויקט (לאישור על גבי הכרטיס):
                </label>
                <input
                  type="text"
                  required
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="למשל: מפתח תוכנה / בודק איכות / מנהל רשת"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-3">
                <label className="flex items-start gap-3 cursor-pointer select-none flex-1">
                  <input
                    type="checkbox"
                    checked={agreedDoc9}
                    onChange={(e) => setAgreedDoc9(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 text-xs sm:text-sm block">
                      אישור בקשה להנפקת כרטיס חכם
                    </span>
                    <span className="text-[11px] text-slate-500 block leading-relaxed">
                      הנני מבקש/ת בזאת הנפקת כרטיס חכם ותג כניסה מורשה עבור תפקידי בפרויקט.
                    </span>
                  </div>
                </label>

                <button
                  type="button"
                  onClick={() => setActiveModalId("doc_9")}
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded-lg hover:bg-blue-50 border border-blue-100 flex-shrink-0"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>הצג נוסח מלא</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Card 5: Unified Digital Signature */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <SignatureCanvas
            onSignatureChange={setSignatureDataUrl}
            isAcknowledged={isAcknowledged}
            onAcknowledgeChange={setIsAcknowledged}
            signerName={fullName}
            disabled={submitting}
          />
        </div>

        {/* Action Button: Final Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={
              submitting ||
              !signatureDataUrl ||
              !isAcknowledged ||
              completedCount < 9
            }
            className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-blue-600/25 transition flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>שולח את טפסי הקליטה...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>
                  {completedCount < 9
                    ? `נא להשלים את כל 9 הטפסים (${completedCount}/9)`
                    : "שליחת טפסי קליטה חתומים"}
                </span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* FULL TEXT MODAL VIEWER */}
      {activeModalId && (
        <FullTextModal
          info={DECLARATIONS_FULL_TEXT[activeModalId]}
          onClose={() => setActiveModalId(null)}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Component: DeclarationRow (Checkbox + Info + "הצג נוסח מלא")
// -------------------------------------------------------------
interface DeclarationRowProps {
  docId: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  onOpenModal: () => void;
}

function DeclarationRow({
  docId,
  title,
  description,
  checked,
  onChange,
  onOpenModal,
}: DeclarationRowProps) {
  return (
    <div
      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        checked
          ? "border-emerald-300 bg-emerald-50/40"
          : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
      }`}
    >
      <label className="flex items-start gap-3 cursor-pointer select-none flex-1">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
        <div className="space-y-0.5">
          <span className="font-bold text-slate-800 text-xs sm:text-sm block">
            {title}
          </span>
          <span className="text-[11px] text-slate-500 block leading-relaxed">
            {description}
          </span>
        </div>
      </label>

      <div className="flex items-center gap-2 self-end sm:self-center">
        {checked && (
          <span className="text-[11px] text-emerald-700 bg-emerald-100/70 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Check className="w-3 h-3" />
            <span>אושר</span>
          </span>
        )}
        <button
          type="button"
          onClick={onOpenModal}
          className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold px-2.5 py-1 rounded-lg hover:bg-blue-50 border border-blue-100 transition"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>הצג נוסח מלא</span>
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Component: FullTextModal
// -------------------------------------------------------------
interface FullTextModalProps {
  info?: {
    id: string;
    name: string;
    shortDesc: string;
    fullContent: string[];
  };
  onClose: () => void;
}

function FullTextModal({ info, onClose }: FullTextModalProps) {
  if (!info) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {info.name}
              </h3>
              <p className="text-xs text-slate-500">{info.shortDesc}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-3.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
          {info.fullContent.map((paragraph, idx) => (
            <p key={idx} className="bg-slate-50/60 p-3 rounded-xl border border-slate-100">
              {paragraph}
            </p>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
          >
            הבנתי וקראתי
          </button>
        </div>
      </div>
    </div>
  );
}
