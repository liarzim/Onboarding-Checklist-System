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
import { formatIsraeliPhone } from "@/lib/validation/phoneFormat";

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
  initialFormData?: any;
}

export default function DigitalFormView({
  docTypeId,
  candidate,
  onFormSubmitted,
  isEmbeddedInPortal = false,
  nextDocTypeId = null,
  onNavigateNext,
  token,
  initialFormData,
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

  // doc_1 fields matching official government form (media_1790443735357.png)
  const candidateParts = (candidate.full_name || "").trim().split(/\s+/);
  const defaultFirstName = candidateParts[0] || "";
  const defaultLastName = candidateParts.slice(1).join(" ") || "";

  const [q1FirstName, setQ1FirstName] = useState(defaultFirstName);
  const [q1LastName, setQ1LastName] = useState(defaultLastName);
  const [q1FirstNameEn, setQ1FirstNameEn] = useState("");
  const [q1LastNameEn, setQ1LastNameEn] = useState("");
  const [q1BirthDate, setQ1BirthDate] = useState("");
  const [q1BirthCountry, setQ1BirthCountry] = useState("ישראל");
  const [q1AliyahYear, setQ1AliyahYear] = useState("");
  const [q1MaritalStatus, setQ1MaritalStatus] = useState("רווק/ה");
  const [q1OtherCitizenship, setQ1OtherCitizenship] = useState("ללא");
  const [q1FatherName, setQ1FatherName] = useState("");
  const [q1PrevLastName, setQ1PrevLastName] = useState("");
  const [q1NameEn, setQ1NameEn] = useState("");
  const [q1Gender, setQ1Gender] = useState("זכר");
  const [q1Religion, setQ1Religion] = useState("יהודי/ת");
  const [q1Address, setQ1Address] = useState("");
  const [q1City, setQ1City] = useState("");
  const [q1Street, setQ1Street] = useState("");
  const [q1HouseNumber, setQ1HouseNumber] = useState("");
  const [q1ZipCode, setQ1ZipCode] = useState("");
  const [q1HomePhone, setQ1HomePhone] = useState("");
  const [q1MobilePhone, setQ1MobilePhone] = useState(() => formatIsraeliPhone(candidate.phone));
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
      let hasAny = false;

      // Personal details (doc_1)
      if (data.q1FirstName) { setQ1FirstName(data.q1FirstName); hasAny = true; }
      if (data.q1LastName) { setQ1LastName(data.q1LastName); hasAny = true; }
      if (data.q1FirstNameEn) { setQ1FirstNameEn(data.q1FirstNameEn); hasAny = true; }
      if (data.q1LastNameEn) { setQ1LastNameEn(data.q1LastNameEn); hasAny = true; }

      const birthDate = data.q1BirthDate || data.birth_date || data.birthDate;
      if (birthDate) { setQ1BirthDate(birthDate); hasAny = true; }

      const birthCountry = data.q1BirthCountry || data.birth_country || data.birthCountry;
      if (birthCountry) { setQ1BirthCountry(birthCountry); hasAny = true; }

      const aliyahYear = data.q1AliyahYear || data.aliyah_year || data.aliyahYear;
      if (aliyahYear) { setQ1AliyahYear(aliyahYear); hasAny = true; }

      const maritalStatus = data.q1MaritalStatus || data.marital_status || data.maritalStatus;
      if (maritalStatus) { setQ1MaritalStatus(maritalStatus); hasAny = true; }

      const otherCitizenship = data.q1OtherCitizenship || data.other_citizenship || data.otherCitizenship || data.q1OtherCitizenshipCountry || data.other_citizenship_country;
      if (otherCitizenship) { setQ1OtherCitizenship(otherCitizenship); hasAny = true; }

      const fatherName = data.q1FatherName || data.q4FatherName || data.father_name || data.fatherName;
      if (fatherName) {
        setQ1FatherName(fatherName);
        setQ4FatherName(fatherName);
        hasAny = true;
      }

      if (data.q1PrevLastName) { setQ1PrevLastName(data.q1PrevLastName); hasAny = true; }

      const nameEn = data.q1NameEn || data.q9NameEn || data.name_en || data.nameEn;
      if (nameEn) {
        setQ1NameEn(nameEn);
        setQ9NameEn(nameEn);
        hasAny = true;
      }

      if (data.q1Gender || data.gender) { setQ1Gender(data.q1Gender || data.gender); hasAny = true; }
      if (data.q1Religion || data.religion) { setQ1Religion(data.q1Religion || data.religion); hasAny = true; }

      const address = data.q1Address || data.q4Address || data.address;
      if (address) {
        setQ1Address(address);
        setQ4Address(address);
        hasAny = true;
      }
      if (data.q1City) { setQ1City(data.q1City); hasAny = true; }
      if (data.q1Street) { setQ1Street(data.q1Street); hasAny = true; }
      if (data.q1HouseNumber) { setQ1HouseNumber(data.q1HouseNumber); hasAny = true; }
      if (data.q1ZipCode) { setQ1ZipCode(data.q1ZipCode); hasAny = true; }

      // Address fallback parsing if address exists but city/street are empty
      if (address && !data.q1City && !data.q1Street) {
        const parts = String(address).split(",").map((p: string) => p.trim());
        if (parts.length >= 2) {
          setQ1City(parts[0]);
          setQ1Street(parts[1]);
          if (parts[2]) setQ1ZipCode(parts[2].replace(/\D/g, ""));
        } else {
          setQ1City(address);
        }
      }

      if (data.q1HomePhone) { setQ1HomePhone(formatIsraeliPhone(data.q1HomePhone)); hasAny = true; }
      const mobile = data.q1MobilePhone || data.phone || data.mobilePhone;
      if (mobile) {
        setQ1MobilePhone(formatIsraeliPhone(mobile));
        hasAny = true;
      }

      // Military service (doc_1)
      const armyService = data.q1ArmyService || data.army_service || data.armyService;
      if (armyService) { setQ1ArmyService(armyService); hasAny = true; }

      const militaryId = data.q1MilitaryId || data.military_id || data.militaryId;
      if (militaryId) { setQ1MilitaryId(militaryId); hasAny = true; }

      const militaryRole = data.q1MilitaryRole || data.military_role || data.militaryRole;
      if (militaryRole) { setQ1MilitaryRole(militaryRole); hasAny = true; }

      const militaryYears = data.q1MilitaryYears || data.military_years || data.militaryYears;
      if (militaryYears) { setQ1MilitaryYears(militaryYears); hasAny = true; }

      const exemptionReason = data.q1ExemptionReason || data.exemption_reason || data.exemptionReason;
      if (exemptionReason) { setQ1ExemptionReason(exemptionReason); hasAny = true; }

      // Education & Workplace (doc_1)
      const educationHigh = data.q1EducationHigh || data.education_high || data.educationHigh;
      if (educationHigh) { setQ1EducationHigh(educationHigh); hasAny = true; }

      const educationAcademic = data.q1EducationAcademic || data.education_academic || data.educationAcademic;
      if (educationAcademic) { setQ1EducationAcademic(educationAcademic); hasAny = true; }

      const workplace1 = data.q1Workplace1 || data.workplace1;
      if (workplace1) { setQ1Workplace1(workplace1); hasAny = true; }

      const workplace2 = data.q1Workplace2 || data.workplace2;
      if (workplace2) { setQ1Workplace2(workplace2); hasAny = true; }

      // References (doc_1)
      const ref1 = data.q1Ref1 || data.ref1 || (data.ref1_name ? `${data.ref1_name}${data.ref1_phone ? ` - ${data.ref1_phone}` : ""}` : "");
      if (ref1) { setQ1Ref1(ref1); hasAny = true; }

      const ref2 = data.q1Ref2 || data.ref2 || (data.ref2_name ? `${data.ref2_name}${data.ref2_phone ? ` - ${data.ref2_phone}` : ""}` : "");
      if (ref2) { setQ1Ref2(ref2); hasAny = true; }

      // doc_4 fields
      const doc4Father = data.q4FatherName || data.father_name || data.fatherName;
      if (doc4Father) { setQ4FatherName(doc4Father); hasAny = true; }

      // doc_9 fields
      const doc9NameEn = data.q9NameEn || data.name_en || data.nameEn;
      if (doc9NameEn) { setQ9NameEn(doc9NameEn); hasAny = true; }

      const roleInProject = data.q9RoleInProject || data.role_in_project || data.roleInProject || data.job_title;
      if (roleInProject) { setQ9RoleInProject(roleInProject); hasAny = true; }

      const managerName = data.q9ManagerName || data.manager_name || data.managerName;
      if (managerName) { setQ9ManagerName(managerName); hasAny = true; }

      const startDate = data.q9StartDate || data.start_date || data.startDate;
      if (startDate) { setQ9StartDate(startDate); hasAny = true; }

      const previousGov = data.q9PreviousGov || data.previous_gov || data.previousGov;
      if (previousGov) { setQ9PreviousGov(previousGov); hasAny = true; }

      const previousDates = data.q9PreviousDates || data.previous_dates || data.previousDates;
      if (previousDates) { setQ9PreviousDates(previousDates); hasAny = true; }

      // Signature restoration
      const signature = data.signatureDataUrl || data.signature_data_url || data.signature_url || data.signatureUrl;
      if (signature) { setSignatureDataUrl(signature); hasAny = true; }

      if (hasAny) {
        setIsPreviousDataLoaded(true);
      }
    }

    async function loadPreviousFormData() {
      // 0. Use initialFormData passed from props if available
      if (initialFormData) {
        applySavedData(initialFormData);
      }

      // 1. Check client localStorage (doc-specific first, then candidate common)
      if (typeof window !== "undefined") {
        const docKey = `form_data_${candidate.candidate_id}_${docTypeId}`;
        const commonKey = `form_data_${candidate.candidate_id}_common`;
        const commonDataStr = localStorage.getItem(commonKey);
        if (commonDataStr) {
          try {
            applySavedData(JSON.parse(commonDataStr));
          } catch {
            // Ignore
          }
        }
        const docDataStr = localStorage.getItem(docKey);
        if (docDataStr) {
          try {
            applySavedData(JSON.parse(docDataStr));
          } catch {
            // Ignore
          }
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
        }
      } catch (err) {
        console.warn("Could not load previous form data:", err);
      }
    }

    loadPreviousFormData();

    return () => {
      isCancelled = true;
    };
  }, [docTypeId, candidate.candidate_id, token, todayStr, initialFormData]);

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
        q1FirstName,
        q1LastName,
        q1FirstNameEn,
        q1LastNameEn,
        q1BirthDate,
        q1BirthCountry,
        q1AliyahYear,
        q1MaritalStatus,
        q1OtherCitizenship,
        q1FatherName,
        q1PrevLastName,
        q1NameEn,
        q1Gender,
        q1Religion,
        q1Address: q1Address || `${q1City}, ${q1Street} ${q1HouseNumber}`.trim(),
        q1City,
        q1Street,
        q1HouseNumber,
        q1ZipCode,
        q1HomePhone: formatIsraeliPhone(q1HomePhone),
        q1MobilePhone: formatIsraeliPhone(q1MobilePhone || candidate.phone),
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
        q4FatherName: q4FatherName || q1FatherName,
        q4Address: q4Address || q1Address || `${q1City}, ${q1Street} ${q1HouseNumber}`.trim(),
        q9NameEn: q9NameEn || q1NameEn,
        q9RoleInProject,
        q9ManagerName,
        q9StartDate,
        q9PreviousGov,
        q9PreviousDates,
        signatureDataUrl,
      };

      // Filter only non-empty fields to preserve earlier answers in common storage
      const nonEmptyAnswers: Record<string, any> = {};
      for (const [k, v] of Object.entries(currentAnswers)) {
        if (v !== undefined && v !== null && v !== "") {
          nonEmptyAnswers[k] = v;
        }
      }

      // Save to localStorage for instant client persistence
      try {
        localStorage.setItem(
          `form_data_${candidate.candidate_id}_${docTypeId}`,
          JSON.stringify(currentAnswers)
        );
        // Also merge only non-empty answers into common answers for this candidate
        const existingCommonStr = localStorage.getItem(`form_data_${candidate.candidate_id}_common`);
        const existingCommon = existingCommonStr ? JSON.parse(existingCommonStr) : {};
        localStorage.setItem(
          `form_data_${candidate.candidate_id}_common`,
          JSON.stringify({ ...existingCommon, ...nonEmptyAnswers })
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
          className={`bg-white text-slate-900 ${
            docTypeId === "doc_1"
              ? "p-6 sm:p-8 max-w-[850px] mx-auto border border-slate-300 shadow-sm space-y-3"
              : "rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-sm space-y-8"
          }`}
          dir="rtl"
        >
          {docTypeId !== "doc_1" && (
            <>
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
                    <span className="font-mono text-slate-700" dir="ltr">
                      {formatIsraeliPhone(candidate.phone) || "לא צוין"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">דואר אלקטרוני:</span>
                    <span className="font-mono text-slate-700" dir="ltr">{candidate.email}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Form Specific Inputs & Layout */}
          {docTypeId === "doc_1" && (
            <Doc1PersonalQuestionnaire
              candidate={candidate}
              todayStr={todayStr}
              signatureDataUrl={signatureDataUrl}
              firstName={q1FirstName}
              setFirstName={setQ1FirstName}
              lastName={q1LastName}
              setLastName={setQ1LastName}
              fatherName={q1FatherName}
              setFatherName={setQ1FatherName}
              prevLastName={q1PrevLastName}
              setPrevLastName={setQ1PrevLastName}
              nameEnFirst={q1FirstNameEn}
              setNameEnFirst={setQ1FirstNameEn}
              nameEnLast={q1LastNameEn}
              setNameEnLast={setQ1LastNameEn}
              gender={q1Gender}
              setGender={setQ1Gender}
              religion={q1Religion}
              setReligion={setQ1Religion}
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
              city={q1City}
              setCity={setQ1City}
              street={q1Street}
              setStreet={setQ1Street}
              houseNumber={q1HouseNumber}
              setHouseNumber={setQ1HouseNumber}
              zipCode={q1ZipCode}
              setZipCode={setQ1ZipCode}
              homePhone={q1HomePhone}
              setHomePhone={setQ1HomePhone}
              mobilePhone={q1MobilePhone}
              setMobilePhone={setQ1MobilePhone}
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

          {/* Signature and Legal Declaration Section for doc_2 through doc_9 */}
          {docTypeId !== "doc_1" && (
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
                  initialSignatureUrl={signatureDataUrl}
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
          )}
        </div>

        {/* Dedicated Web Signing Pad for doc_1 (outside printRef so PDF is pure authentic gov doc) */}
        {docTypeId === "doc_1" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="font-bold text-sm text-slate-900 border-b pb-2">
              חתימה דיגיטלית על שאלון רמה 5 (החתימה מוטמעת ישירות בחלק ב' של המסמך הממשלתי)
            </div>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-700 leading-relaxed font-medium">
                הנני מאשר/ת בחתימתי כי כל הפרטים שנמסרו בשאלון אישי זה נכונים, מדויקים ומלאים.
              </span>
            </label>

            <div>
              <SignaturePad
                onSignatureChange={setSignatureDataUrl}
                signerName={candidate.full_name}
                initialSignatureUrl={signatureDataUrl}
              />
            </div>
          </div>
        )}

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
// Form 1: Personal Questionnaire Level 5 (Authentic Government Layout)
// Matches media_1790443735357.png
// -------------------------------------------------------------
function Doc1PersonalQuestionnaire({
  candidate,
  todayStr,
  signatureDataUrl,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  fatherName,
  setFatherName,
  prevLastName,
  setPrevLastName,
  nameEnFirst,
  setNameEnFirst,
  nameEnLast,
  setNameEnLast,
  gender,
  setGender,
  religion,
  setReligion,
  birthDate,
  setBirthDate,
  birthCountry,
  setBirthCountry,
  aliyahYear,
  setAliyahYear,
  otherCitizenship,
  setOtherCitizenship,
  city,
  setCity,
  street,
  setStreet,
  houseNumber,
  setHouseNumber,
  zipCode,
  setZipCode,
  homePhone,
  setHomePhone,
  mobilePhone,
  setMobilePhone,
}: any) {
  // Padded 9-digit Israeli ID
  const rawId: string = String(candidate?.id_number || "").replace(/\D/g, "");
  const paddedId: string = rawId.padStart(9, "0").slice(-9);
  const idDigits: string[] = paddedId.split("");

  return (
    <div className="space-y-3 text-slate-900 bg-white" dir="rtl">
      {/* 1. Top Security Warning Box */}
      <div className="border-2 border-slate-900 py-1 px-2 text-center text-xs font-bold text-slate-900 leading-tight">
        מסמך זה מכיל מידע לצורך הליך של הגנת סודיות. כל המוסרו שלא כדין עובר עבירה
      </div>

      {/* 2. Emblem and Header */}
      <div className="flex flex-col items-center justify-center text-center space-y-0.5 pt-0.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logos/israel_emblem.png"
          alt="סמל מדינת ישראל"
          className="h-11 w-auto object-contain mx-auto"
        />
        <div className="text-[11px] font-bold text-slate-900">מדינת ישראל</div>
        <div className="text-[10px] font-bold text-slate-900">
          היחידה הממלכתית לקביעת התאמה ביטחונית
        </div>
        <h1 className="text-base sm:text-lg font-black text-slate-900 pt-0.5">
          שאלון אישי לצרכי קביעת התאמה ביטחונית
        </h1>
        <h2 className="text-xs sm:text-sm font-bold text-slate-900">
          למועמד/ת לרמה 5
        </h2>
      </div>

      {/* 3. Routing Line (אל / מאת / גוף משלח) */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-900 pt-0.5 pb-1 border-b border-slate-400">
        <div className="flex items-center gap-1">
          <span>אל:</span>
          <span className="font-normal underline decoration-dotted underline-offset-4">ממונה ביטחון</span>
        </div>
        <div className="flex items-center gap-1">
          <span>מאת:</span>
          <span className="font-bold underline decoration-dotted underline-offset-4">{candidate.full_name}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>גוף משלח:</span>
          <span className="font-normal underline decoration-dotted underline-offset-4">
            {candidate.vendor_company_name || candidate.vendor_id || candidate.project_id}
          </span>
        </div>
      </div>

      {/* 4. חלק א' - פרטים אישיים */}
      <div className="space-y-1">
        <div className="font-bold text-xs sm:text-sm text-slate-900">
          חלק א' - פרטים אישיים
        </div>

        {/* Table 1: Names Grid */}
        <table className="w-full border-collapse border border-slate-900 text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-900">
              <th className="border border-slate-900 p-1 w-16 text-center font-bold"> </th>
              <th className="border border-slate-900 p-1 text-center font-bold">שם משפחה</th>
              <th className="border border-slate-900 p-1 text-center font-bold">שם פרטי</th>
              <th className="border border-slate-900 p-1 text-center font-bold">שם אב</th>
              <th className="border border-slate-900 p-1 text-center font-bold">שם משפחה קודם/נוסף</th>
            </tr>
          </thead>
          <tbody>
            {/* Current Names Row - Hebrew */}
            <tr>
              <td rowSpan={2} className="border border-slate-900 p-1 text-center font-bold bg-slate-50 align-middle">
                נוכחי
              </td>
              <td className="border border-slate-900 p-1 text-center align-middle">
                <span className="text-[9px] text-slate-500 block text-right">בעברית:</span>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="משפחה"
                  className="w-full text-center font-bold text-slate-900 bg-transparent focus:outline-none p-0.5 text-xs sm:text-sm"
                  dir="rtl"
                />
              </td>
              <td className="border border-slate-900 p-1 text-center align-middle">
                <span className="text-[9px] text-slate-500 block text-right">בעברית:</span>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="פרטי"
                  className="w-full text-center font-bold text-slate-900 bg-transparent focus:outline-none p-0.5 text-xs sm:text-sm"
                  dir="rtl"
                />
              </td>
              <td className="border border-slate-900 p-1 text-center align-middle">
                <span className="text-[9px] text-slate-500 block text-right">בעברית:</span>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="שם האב"
                  className="w-full text-center font-bold text-slate-900 bg-transparent focus:outline-none p-0.5 text-xs sm:text-sm"
                  dir="rtl"
                />
              </td>
              <td className="border border-slate-900 p-1 text-center align-middle">
                <span className="text-[9px] text-slate-500 block text-right">בעברית:</span>
                <input
                  type="text"
                  value={prevLastName}
                  onChange={(e) => setPrevLastName(e.target.value)}
                  placeholder="קודם/נוסף"
                  className="w-full text-center font-bold text-slate-900 bg-transparent focus:outline-none p-0.5 text-xs sm:text-sm"
                  dir="rtl"
                />
              </td>
            </tr>
            {/* Current Names Row - English */}
            <tr>
              <td className="border border-slate-900 p-1 text-center align-middle">
                <span className="text-[9px] text-slate-500 block text-right">בלועזית:</span>
                <input
                  type="text"
                  value={nameEnLast}
                  onChange={(e) => setNameEnLast(e.target.value)}
                  placeholder="Last Name"
                  className="w-full text-center font-bold text-slate-900 bg-transparent focus:outline-none p-0.5 text-xs sm:text-sm"
                  dir="ltr"
                />
              </td>
              <td className="border border-slate-900 p-1 text-center align-middle">
                <span className="text-[9px] text-slate-500 block text-right">בלועזית:</span>
                <input
                  type="text"
                  value={nameEnFirst}
                  onChange={(e) => setNameEnFirst(e.target.value)}
                  placeholder="First Name"
                  className="w-full text-center font-bold text-slate-900 bg-transparent focus:outline-none p-0.5 text-xs sm:text-sm"
                  dir="ltr"
                />
              </td>
              <td className="border border-slate-900 p-1 text-center align-middle bg-slate-50/40">
                <span className="text-[9px] text-slate-400 block text-right">בלועזית:</span>
                <span className="text-slate-300">-</span>
              </td>
              <td className="border border-slate-900 p-1 text-center align-middle bg-slate-50/40">
                <span className="text-[9px] text-slate-400 block text-right">בלועזית:</span>
                <span className="text-slate-300">-</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Table 2: ID Digits, Previous ID & Gender */}
        <table className="w-full border-collapse border border-slate-900 text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-900">
              <th className="border border-slate-900 p-1 text-center font-bold" style={{ width: "45%" }}>
                מס' זהות
              </th>
              <th className="border border-slate-900 p-1 text-center font-bold" style={{ width: "35%" }}>
                מס' זיהוי קודם/נוסף
              </th>
              <th className="border border-slate-900 p-1 text-center font-bold" style={{ width: "20%" }}>
                מין
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {/* 9 Centered Square Boxes for ID Digits */}
              <td className="border border-slate-900 p-1.5 text-center align-middle">
                <div className="flex items-center justify-center gap-1" dir="ltr">
                  {idDigits.map((digit: string, i: number) => (
                    <div
                      key={i}
                      className="w-6 h-6 sm:w-7 sm:h-7 border border-slate-900 flex items-center justify-center font-mono font-bold text-xs sm:text-sm text-slate-900 bg-white shadow-2xs"
                    >
                      {digit}
                    </div>
                  ))}
                </div>
              </td>
              {/* 9 Empty/Placeholder Boxes for Previous ID */}
              <td className="border border-slate-900 p-1.5 text-center align-middle">
                <div className="flex items-center justify-center gap-1" dir="ltr">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 sm:w-7 sm:h-7 border border-slate-400 flex items-center justify-center font-mono text-xs text-slate-300 bg-slate-50/50"
                    >
                      {" "}
                    </div>
                  ))}
                </div>
              </td>
              {/* Gender Radio Choices */}
              <td className="border border-slate-900 p-1.5 text-center align-middle">
                <div className="flex items-center justify-center gap-3 text-xs font-bold">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="q1Gender"
                      value="זכר"
                      checked={gender === "זכר"}
                      onChange={() => setGender("זכר")}
                      className="w-3.5 h-3.5 text-slate-900"
                    />
                    <span>זכר</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="q1Gender"
                      value="נקבה"
                      checked={gender === "נקבה"}
                      onChange={() => setGender("נקבה")}
                      className="w-3.5 h-3.5 text-slate-900"
                    />
                    <span>נקבה</span>
                  </label>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Table 3: Religion, Birth Date, Birth Country, Aliyah, Additional Citizenship */}
        <table className="w-full border-collapse border border-slate-900 text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-900">
              <th className="border border-slate-900 p-1 text-center font-bold">דת</th>
              <th className="border border-slate-900 p-1 text-center font-bold">תאריך לידה</th>
              <th className="border border-slate-900 p-1 text-center font-bold">ארץ לידה</th>
              <th className="border border-slate-900 p-1 text-center font-bold">תאריך עליה</th>
              <th className="border border-slate-900 p-1 text-center font-bold">
                אזרחות נוספת או מעמד של תושב קבע (אם יש ציין)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {/* Religion */}
              <td className="border border-slate-900 p-1 text-center align-middle">
                <input
                  type="text"
                  value={religion}
                  onChange={(e) => setReligion(e.target.value)}
                  placeholder="למשל: יהודי/ת"
                  className="w-full text-center font-bold text-slate-900 bg-transparent focus:outline-none p-1 text-xs"
                  dir="rtl"
                />
              </td>
              {/* Birth Date */}
              <td className="border border-slate-900 p-1 text-center align-middle">
                <input
                  type="text"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full text-center font-bold text-slate-900 bg-transparent focus:outline-none p-1 text-xs"
                  dir="ltr"
                />
              </td>
              {/* Birth Country */}
              <td className="border border-slate-900 p-1 text-center align-middle">
                <div className="flex flex-col gap-1 text-[11px] text-right">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="q1BirthCountryChoice"
                      checked={birthCountry === "ישראל"}
                      onChange={() => setBirthCountry("ישראל")}
                      className="w-3.5 h-3.5 text-slate-900"
                    />
                    <span>ישראל</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="q1BirthCountryChoice"
                      checked={birthCountry !== "ישראל"}
                      onChange={() => {
                        if (birthCountry === "ישראל") setBirthCountry("");
                      }}
                      className="w-3.5 h-3.5 text-slate-900"
                    />
                    <span>אחר:</span>
                    {birthCountry !== "ישראל" && (
                      <input
                        type="text"
                        value={birthCountry}
                        onChange={(e) => setBirthCountry(e.target.value)}
                        className="border-b border-slate-900 text-center font-bold text-xs bg-transparent w-16 focus:outline-none"
                        placeholder="ארץ"
                      />
                    )}
                  </label>
                </div>
              </td>
              {/* Aliyah Date */}
              <td className="border border-slate-900 p-1 text-center align-middle">
                <input
                  type="text"
                  value={aliyahYear}
                  onChange={(e) => setAliyahYear(e.target.value)}
                  placeholder="יליד הארץ"
                  className="w-full text-center font-bold text-slate-900 bg-transparent focus:outline-none p-1 text-xs"
                />
              </td>
              {/* Additional Citizenship */}
              <td className="border border-slate-900 p-1 text-center align-middle">
                <div className="flex items-center justify-center gap-2 text-[11px]">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="q1CitizenshipChoice"
                      checked={otherCitizenship === "ישראלית"}
                      onChange={() => setOtherCitizenship("ישראלית")}
                      className="w-3 h-3 text-slate-900"
                    />
                    <span>ישראלית</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="q1CitizenshipChoice"
                      checked={otherCitizenship === "ללא" || !otherCitizenship}
                      onChange={() => setOtherCitizenship("ללא")}
                      className="w-3 h-3 text-slate-900"
                    />
                    <span>ללא</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="q1CitizenshipChoice"
                      checked={otherCitizenship !== "ישראלית" && otherCitizenship !== "ללא" && otherCitizenship !== ""}
                      onChange={() => {
                        if (otherCitizenship === "ישראלית" || otherCitizenship === "ללא") setOtherCitizenship("אחרת");
                      }}
                      className="w-3 h-3 text-slate-900"
                    />
                    <span>אחרת:</span>
                    {otherCitizenship !== "ישראלית" && otherCitizenship !== "ללא" && (
                      <input
                        type="text"
                        value={otherCitizenship === "אחרת" ? "" : otherCitizenship}
                        onChange={(e) => setOtherCitizenship(e.target.value)}
                        className="border-b border-slate-900 text-center font-bold text-xs bg-transparent w-16 focus:outline-none"
                        placeholder="ציין"
                      />
                    )}
                  </label>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 5. חלק ב' - שירותי תקשורת */}
      <div className="space-y-1">
        <div className="font-bold text-xs sm:text-sm text-slate-900">
          חלק ב' - שירותי תקשורת
        </div>
        <div className="text-[11px] font-bold text-slate-800">
          כתובת נוכחית
        </div>

        {/* Address & Phones Table */}
        <table className="w-full border-collapse border border-slate-900 text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-900">
              <th className="border border-slate-900 p-1 text-center font-bold">ישוב</th>
              <th className="border border-slate-900 p-1 text-center font-bold">רחוב</th>
              <th className="border border-slate-900 p-1 text-center font-bold">מס' בית/דירה</th>
              <th className="border border-slate-900 p-1 text-center font-bold">מיקוד</th>
              <th className="border border-slate-900 p-1 text-center font-bold">טלפון בבית</th>
              <th className="border border-slate-900 p-1 text-center font-bold">נייד</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {/* City */}
              <td className="border border-slate-900 p-1 text-center align-middle">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="עיר / ישוב"
                  className="w-full text-center font-bold text-slate-900 bg-transparent focus:outline-none p-1 text-xs"
                  dir="rtl"
                />
              </td>
              {/* Street */}
              <td className="border border-slate-900 p-1 text-center align-middle">
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="שם רחוב"
                  className="w-full text-center font-bold text-slate-900 bg-transparent focus:outline-none p-1 text-xs"
                  dir="rtl"
                />
              </td>
              {/* House Number */}
              <td className="border border-slate-900 p-1 text-center align-middle">
                <input
                  type="text"
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  placeholder="מספר"
                  className="w-full text-center font-bold text-slate-900 bg-transparent focus:outline-none p-1 text-xs"
                />
              </td>
              {/* Zip Code */}
              <td className="border border-slate-900 p-1 text-center align-middle">
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="מיקוד"
                  className="w-full text-center font-mono font-bold text-slate-900 bg-transparent focus:outline-none p-1 text-xs"
                  dir="ltr"
                />
              </td>
              {/* Home Phone */}
              <td className="border border-slate-900 p-1 text-center align-middle">
                <input
                  type="text"
                  value={homePhone}
                  onChange={(e) => setHomePhone(e.target.value)}
                  onBlur={() => setHomePhone(formatIsraeliPhone(homePhone))}
                  placeholder="0X-XXXXXXX"
                  className="w-full text-center font-mono font-bold text-slate-900 bg-transparent focus:outline-none p-1 text-xs"
                  dir="ltr"
                />
              </td>
              {/* Mobile Phone */}
              <td className="border border-slate-900 p-1 text-center align-middle">
                <input
                  type="text"
                  value={mobilePhone}
                  onChange={(e) => setMobilePhone(e.target.value)}
                  onBlur={() => setMobilePhone(formatIsraeliPhone(mobilePhone))}
                  placeholder="05X-XXXXXXX"
                  className="w-full text-center font-mono font-bold text-slate-900 bg-transparent focus:outline-none p-1 text-xs"
                  dir="ltr"
                />
              </td>
            </tr>
          </tbody>
        </table>

        {/* Email Full-Width Row */}
        <div className="border border-slate-900 p-1 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 pr-2">כתובת דואר אלקטרוני:</span>
          <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm pl-2" dir="ltr">
            {candidate.email}
          </span>
        </div>

        {/* Candidate Signature & Date Row */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-900 pt-1 pb-1">
          <div className="flex items-center gap-1.5">
            <span>תאריך:</span>
            <span className="font-mono font-bold underline decoration-dotted underline-offset-4">{todayStr}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>חתימת המועמד/ת:</span>
            <div className="h-9 sm:h-10 w-40 border-b border-slate-900 flex items-center justify-center">
              {signatureDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signatureDataUrl}
                  alt="חתימת המועמד/ת"
                  className="h-8 sm:h-9 w-auto max-w-[130px] object-contain"
                />
              ) : (
                <span className="text-[10px] text-slate-400 italic">
                  [חתימה תוצג כאן לאחר החתימה]
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 6. חלק ג' - מילוי המשרד המקצועי (ימולא ע"י הביטחון) */}
      <div className="space-y-1">
        <div className="font-bold text-xs sm:text-sm text-slate-900">
          חלק ג' - מילוי המשרד המקצועי (ימולא ע"י הביטחון)
        </div>

        <table className="w-full border-collapse border border-slate-900 text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-900">
              <th className="border border-slate-900 p-1 text-center font-bold" style={{ width: "30%" }}>
                הגוף המשלח
              </th>
              <th className="border border-slate-900 p-1 text-center font-bold" style={{ width: "25%" }}>
                תפקיד
              </th>
              <th className="border border-slate-900 p-1 text-center font-bold" style={{ width: "22%" }}>
                מעמד
              </th>
              <th className="border border-slate-900 p-1 text-center font-bold" style={{ width: "23%" }}>
                היבטי אבטחה
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {/* Sending Entity */}
              <td className="border border-slate-900 p-1.5 text-center align-middle font-bold text-slate-900 text-xs">
                {candidate.vendor_company_name || candidate.vendor_id || candidate.project_id}
              </td>
              {/* Role */}
              <td className="border border-slate-900 p-1.5 text-center align-middle font-bold text-slate-900 text-xs">
                יועץ / מומחה ({candidate.project_id})
              </td>
              {/* Employment Status Checkboxes */}
              <td className="border border-slate-900 p-1.5 align-middle">
                <div className="grid grid-cols-2 gap-0.5 text-[10px] text-right font-medium">
                  <div className="flex items-center gap-1"><span className="font-bold">☒</span> קבוע</div>
                  <div className="flex items-center gap-1"><span className="font-bold">☐</span> זמני</div>
                  <div className="flex items-center gap-1"><span className="font-bold">☐</span> עובד</div>
                  <div className="flex items-center gap-1"><span className="font-bold">☒</span> קבלן</div>
                  <div className="flex items-center gap-1 col-span-2"><span className="font-bold">☐</span> אחר: _____</div>
                </div>
              </td>
              {/* Security Aspects Checkboxes */}
              <td className="border border-slate-900 p-1.5 align-middle">
                <div className="space-y-0.5 text-[10px] text-right font-medium">
                  <div className="flex items-center gap-1"><span className="font-bold">☒</span> מידע</div>
                  <div className="flex items-center gap-1"><span className="font-bold">☐</span> אבטחת אישים</div>
                  <div className="flex items-center gap-1"><span className="font-bold">☒</span> אבטחת מתקנים</div>
                  <div className="flex items-center gap-1"><span className="font-bold">☐</span> אבטחה פיזית</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Notes Line */}
        <div className="text-[11px] font-bold text-slate-900 pt-0.5">
          <span>הערות: </span>
          <span className="font-normal underline decoration-dotted underline-offset-4">
            שאלון רמה 5 הוגש ונבדק דיגיטלית במערכת Onboarding Checklist
          </span>
        </div>
      </div>

      {/* 7. חלק ד' - אימות פרטים (ימולא ע"י קצין ביטחון) */}
      <div className="space-y-1">
        <div className="font-bold text-xs sm:text-sm text-slate-900">
          חלק ד' - אימות פרטים (ימולא ע"י קצין ביטחון)
        </div>

        <div className="border border-slate-900 p-2 space-y-1.5 text-xs">
          <p className="font-medium text-slate-900 leading-tight">
            אני מצהיר/ה בזאת כי בדקתי את זהות המועמד/ת לשאלון והפרטים שמולאו ולם נמצאו נכונים לפי המסמכים המוצגים הבאים:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-[11px] font-semibold text-slate-900">
            <div className="flex items-center gap-1">
              <span className="font-bold">☒</span>
              <span>תעודת זהות - מס' {candidate.id_number}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold">☐</span>
              <span>דרכון - מס' _______</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold">☒</span>
              <span>רישיון נהיגה - מס' _______</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold">☐</span>
              <span>תעודת תושב קבע</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold">☒</span>
              <span>כתב ויתור סודיות רפואית ופלילית</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold">☒</span>
              <span>עלון לנבדק</span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-400 grid grid-cols-4 gap-2 text-center text-[10px] font-bold text-slate-900">
            <div>
              <span className="text-slate-500 block text-[9px]">תאריך</span>
              <span>{todayStr}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">תואר ודרגת הבודק/ת</span>
              <span>ממונה ביטחון</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">שם מלא של הבודק/ת</span>
              <span>מטה אבטחה וסייבר</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">חתימת הבודק/ת</span>
              <span className="font-mono text-slate-400 font-normal">מאומת דיגיטלית</span>
            </div>
          </div>
        </div>
      </div>

      {/* 8. Bottom Footer */}
      <div className="flex items-center justify-between text-[10px] text-slate-600 pt-0.5 font-mono">
        <div>טופס 138/01</div>
        <div className="text-center font-bold text-slate-900">- 1 -</div>
        <div className="opacity-0">טופס 138/01</div>
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
            className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white text-center font-bold text-slate-900"
            dir="rtl"
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
            className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white text-center font-bold text-slate-900"
            dir="rtl"
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
            <div className="p-2.5 bg-white border-b-2 border-slate-400 font-bold text-slate-900 rounded-t text-center">
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
              className="w-full border-b-2 border-slate-400 p-2.5 text-xs bg-white focus:outline-hidden font-bold text-center rounded-t"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">מספר תעודת זהות:</label>
            <div className="p-2.5 bg-white border-b-2 border-slate-400 font-mono font-bold text-slate-900 rounded-t text-center">
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
              className="w-full border-b-2 border-slate-400 p-2.5 text-xs bg-white focus:outline-hidden font-bold text-center rounded-t"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">דואר אלקטרוני:</label>
            <div className="p-2.5 bg-white border-b-2 border-slate-400 font-mono font-bold text-slate-900 rounded-t text-center" dir="ltr">
              {candidate.email}
            </div>
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">סוג העסקה:</label>
            <div className="p-2.5 bg-white border-b-2 border-slate-400 font-semibold text-slate-800 rounded-t text-center">
              עובד קבלן / מיקור חוץ ({candidate.vendor_company_name || candidate.vendor_id})
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">תאריך תחילת העסקה:</label>
            <input
              type="text"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              dir="ltr"
              className="w-full border-b-2 border-slate-400 p-2.5 text-xs bg-white focus:outline-hidden font-bold text-center rounded-t"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">העסקה במשרד ממשלתי קודם (כן/לא ותאריכים):</label>
            <div className="flex gap-2">
              <select
                value={previousGov}
                onChange={(e) => setPreviousGov(e.target.value)}
                className="border-b-2 border-slate-400 p-2 text-xs bg-white focus:outline-hidden font-bold rounded-t text-center"
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
                  className="flex-1 border-b-2 border-slate-400 p-2 text-xs bg-white focus:outline-hidden font-bold rounded-t text-center"
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
