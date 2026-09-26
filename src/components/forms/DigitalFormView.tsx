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
  Eye,
  Edit3,
  FileText,
  ShieldCheck,
  Check,
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

  // Dynamic template content loading
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

  // Flow State: false = Dedicated Input Screen, true = A4 PDF Preview & Approval Screen
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Form State
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPreviousDataLoaded, setIsPreviousDataLoaded] = useState(false);

  // doc_1 fields matching official government form
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

  // doc_9 fields
  const [q9NameEn, setQ9NameEn] = useState("");
  const [q9RoleInProject, setQ9RoleInProject] = useState("");
  const [q9ManagerName, setQ9ManagerName] = useState("");
  const [q9StartDate, setQ9StartDate] = useState(todayStr);
  const [q9PreviousGov, setQ9PreviousGov] = useState("לא");
  const [q9PreviousDates, setQ9PreviousDates] = useState("");

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

      const otherCitizenship = data.q1OtherCitizenship || data.other_citizenship || data.otherCitizenship;
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

      const educationHigh = data.q1EducationHigh || data.education_high || data.educationHigh;
      if (educationHigh) { setQ1EducationHigh(educationHigh); hasAny = true; }

      const educationAcademic = data.q1EducationAcademic || data.education_academic || data.educationAcademic;
      if (educationAcademic) { setQ1EducationAcademic(educationAcademic); hasAny = true; }

      const workplace1 = data.q1Workplace1 || data.workplace1;
      if (workplace1) { setQ1Workplace1(workplace1); hasAny = true; }

      const workplace2 = data.q1Workplace2 || data.workplace2;
      if (workplace2) { setQ1Workplace2(workplace2); hasAny = true; }

      const ref1 = data.q1Ref1 || data.ref1;
      if (ref1) { setQ1Ref1(ref1); hasAny = true; }

      const ref2 = data.q1Ref2 || data.ref2;
      if (ref2) { setQ1Ref2(ref2); hasAny = true; }

      const doc4Father = data.q4FatherName || data.father_name || data.fatherName;
      if (doc4Father) { setQ4FatherName(doc4Father); hasAny = true; }

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

      const signature = data.signatureDataUrl || data.signature_data_url || data.signature_url || data.signatureUrl;
      if (signature) { setSignatureDataUrl(signature); hasAny = true; }

      if (hasAny) {
        setIsPreviousDataLoaded(true);
      }
    }

    async function loadPreviousFormData() {
      if (initialFormData) {
        applySavedData(initialFormData);
      }

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

  // Validation before proceeding to PDF Preview
  function handleProceedToPreview(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!agreeTerms) {
      setErrorMessage("יש לסמן את אישור הצהרת המועמד/ת כדי להמשיך.");
      return;
    }

    if (!signatureDataUrl) {
      setErrorMessage("חובה להוסיף חתימה דיגיטלית בתיבת החתימה לפני המעבר לתצוגה מקדימה.");
      return;
    }

    if (docTypeId === "doc_1") {
      if (!q1FirstName.trim() || !q1LastName.trim()) {
        setErrorMessage("נא למלא שם פרטי ושם משפחה בשאלון האישי.");
        return;
      }
    }

    if (docTypeId === "doc_4") {
      if (!q4FatherName.trim() || !(q4Address || q1Address || q1City).trim()) {
        setErrorMessage("נא למלא שם אב וכתובת מגורים מלאה בטופס הסכמה למסירת מידע פלילי.");
        return;
      }
    }

    if (docTypeId === "doc_9") {
      if (!q9RoleInProject.trim()) {
        setErrorMessage("נא לציין את התפקיד המיועד בפרויקט עבור הנפקת הכרטיס.");
        return;
      }
    }

    setIsPreviewMode(true);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // Handle final approval, PDF generation & Google Drive upload
  async function handleApproveAndSave() {
    setErrorMessage(null);

    if (!printRef.current) {
      setErrorMessage("שגיאה במערכת: אלמנט המסמך לא נמצא לצורך הפקת PDF.");
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

      const nonEmptyAnswers: Record<string, any> = {};
      for (const [k, v] of Object.entries(currentAnswers)) {
        if (v !== undefined && v !== null && v !== "") {
          nonEmptyAnswers[k] = v;
        }
      }

      try {
        localStorage.setItem(
          `form_data_${candidate.candidate_id}_${docTypeId}`,
          JSON.stringify(currentAnswers)
        );
        const existingCommonStr = localStorage.getItem(`form_data_${candidate.candidate_id}_common`);
        const existingCommon = existingCommonStr ? JSON.parse(existingCommonStr) : {};
        localStorage.setItem(
          `form_data_${candidate.candidate_id}_common`,
          JSON.stringify({ ...existingCommon, ...nonEmptyAnswers })
        );
      } catch {
        // Ignore
      }

      // Generate standard A4 PDF file (21cm x 29.7cm)
      const cleanId = candidate.id_number ? `.${candidate.id_number}` : "";
      const targetFileName = `${docInfo.name || meta.title}.${candidate.full_name}${cleanId}.pdf`;
      const pdfFile = await generatePdfFromElement(printRef.current, targetFileName);

      // Upload to Google Drive and register in database
      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append("candidate_id", candidate.candidate_id);
      formData.append("doc_type_id", docTypeId);
      formData.append("form_data", JSON.stringify(currentAnswers));
      if (token) {
        formData.append("token", token);
      }

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "שגיאה בשמירת המסמך והעלאתו ל-Drive");
      }

      setSuccessMessage("המסמך אושר בהצלחה, הופק ל-PDF רשמי ונשמר בתיקיית Google Drive!");

      if (onFormSubmitted) {
        onFormSubmitted(docTypeId);
      }

      // Automatically advance to the next document in candidate portal
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
        err instanceof Error ? err.message : "שגיאה בלתי צפויה בהפקת המסמך ובשמירתו"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16" dir="rtl">
      {/* Top Breadcrumb / Return Link - only when not embedded */}
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
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
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
      {isPreviousDataLoaded && !isPreviewMode && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-amber-600" />
            <span>
              <strong>נתונים שמולאו בעבר נטענו לטופס זה.</strong> באפשרותך לערוך ולתקן את השדות, לחתום מחדש ולעבור לתצוגה מקדימה לאישור.
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

      {/* ======================================================== */}
      {/* PHASE 1: DEDICATED INPUT SCREEN (OUTSIDE THE DOCUMENT)   */}
      {/* ======================================================== */}
      {!isPreviewMode && (
        <form onSubmit={handleProceedToPreview} className="space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  שלב 1 מתוך 2: מילוי פרטים במסך ייעודי
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                  {docInfo.name}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                  {docInfo.shortDesc}
                </p>
              </div>
              <div className="text-xs text-slate-500 text-left font-mono">
                <div>תאריך: {todayStr}</div>
                <div>גרסה: {meta.version}</div>
              </div>
            </div>

            {/* Candidate Summary Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl text-xs">
              <div>
                <span className="text-slate-500 block">שם מועמד/ת:</span>
                <span className="font-bold text-slate-900">{candidate.full_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">תעודת זהות:</span>
                <span className="font-mono font-bold text-slate-900">{candidate.id_number}</span>
              </div>
              <div>
                <span className="text-slate-500 block">פרויקט:</span>
                <span className="font-semibold text-slate-800">{candidate.project_id}</span>
              </div>
              <div>
                <span className="text-slate-500 block">חברת מעסיק:</span>
                <span className="font-semibold text-slate-800">
                  {candidate.vendor_company_name || candidate.vendor_id}
                </span>
              </div>
            </div>
          </div>

          {/* Form-Specific Input Screen */}
          {docTypeId === "doc_1" && (
            <Doc1DedicatedInputForm
              firstName={q1FirstName}
              setFirstName={setQ1FirstName}
              lastName={q1LastName}
              setLastName={setQ1LastName}
              firstNameEn={q1FirstNameEn}
              setFirstNameEn={setQ1FirstNameEn}
              lastNameEn={q1LastNameEn}
              setLastNameEn={setQ1LastNameEn}
              fatherName={q1FatherName}
              setFatherName={setQ1FatherName}
              prevLastName={q1PrevLastName}
              setPrevLastName={setQ1PrevLastName}
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
              candidatePhone={candidate.phone}
              candidateEmail={candidate.email}
            />
          )}

          {docTypeId === "doc_4" && (
            <Doc4DedicatedInputForm
              fatherName={q4FatherName}
              setFatherName={setQ4FatherName}
              address={q4Address}
              setAddress={setQ4Address}
              docInfo={docInfo}
            />
          )}

          {docTypeId === "doc_9" && (
            <Doc9DedicatedInputForm
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
              candidate={candidate}
            />
          )}

          {["doc_2", "doc_3", "doc_5", "doc_6", "doc_7", "doc_8"].includes(docTypeId) && (
            <DocClausesDedicatedInputForm docInfo={docInfo} />
          )}

          {/* Declaration and Digital Signature Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <span>הצהרת המועמד/ת וחתימה דיגיטלית</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                חתימתך תוטמע באופן רשמי במסמך ה-PDF שיופק ויאושר בשלב הבא
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer select-none bg-slate-50 p-4 rounded-xl border border-slate-200 hover:bg-slate-100/70 transition">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                הנני מאשר/ת בחתימתי כי קראתי בעיון את כל סעיפי המסמך, הבנתי את תוכנו ומשמעותו המשפטית,
                וכל הפרטים שנמסרו על ידי נכונים, מדויקים ומלאים.
              </span>
            </label>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                חתימה דיגיטלית (באמצעות האצבע או העכבר):
              </label>
              <SignaturePad
                onSignatureChange={setSignatureDataUrl}
                signerName={candidate.full_name}
                initialSignatureUrl={signatureDataUrl}
              />
            </div>
          </div>

          {/* Action Bar for Phase 1 */}
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
                בשלב הבא תוצג תצוגה מקדימה מלאה של דף ה-A4 לאישורך הסופי
              </div>
            )}

            <button
              type="submit"
              disabled={!signatureDataUrl || !agreeTerms}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eye className="w-4 h-4" />
              <span>המשך לתצוגה מקדימה לאישור המסמך (A4)</span>
            </button>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* PHASE 2: A4 PDF PREVIEW & FINAL APPROVAL SCREEN          */}
      {/* ======================================================== */}
      {isPreviewMode && (
        <div className="space-y-6">
          {/* Top Approval Bar */}
          <div className="bg-white rounded-2xl border-2 border-blue-500 p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white bg-blue-600 px-2.5 py-0.5 rounded-full">
                  שלב 2 מתוך 2: תצוגה מקדימה ואישור
                </span>
                <span className="text-xs font-bold text-slate-500">גודל דף: A4 סטנדרטי (21 × 29.7 ס"מ)</span>
              </div>
              <h2 className="text-lg font-black text-slate-900">
                נא לבדוק את מסמך ה-PDF הרשמי ולאשר
              </h2>
              <p className="text-xs text-slate-600">
                ודא שכל הנתונים והחתימה מופיעים כהלכה. לחיצה על "אשר ושמור" תשמור את הקובץ ישירות בתיקיית Google Drive של המועמד ותעבור לטופס הבא.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsPreviewMode(false);
                  if (typeof window !== "undefined") {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition disabled:opacity-50"
              >
                <Edit3 className="w-4 h-4 text-slate-500" />
                <span>חזרה לעריכת פרטים</span>
              </button>

              <button
                type="button"
                onClick={handleApproveAndSave}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>שומר ב-Drive...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>אשר ושמור ב-Google Drive</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Document Preview Framing Container */}
          <div className="bg-slate-200/80 p-3 sm:p-8 rounded-3xl overflow-x-auto shadow-inner flex justify-center">
            {/* The printable A4 element captured by html2canvas */}
            <div
              ref={printRef}
              data-single-page={docTypeId === "doc_1" || docTypeId === "doc_3" || docTypeId === "doc_4" ? "true" : undefined}
              style={{ width: "794px", minWidth: "794px" }}
              className="bg-white text-slate-900 shadow-2xl border border-slate-300 p-6 sm:p-8 space-y-4"
              dir="rtl"
            >
              {/* Header with Logos for doc_2 through doc_9 */}
              {docTypeId !== "doc_1" && (
                <div className="pdf-section border-b-2 border-slate-900 pb-4 space-y-3" data-pdf-section="header">
                  <div className="flex items-center justify-between">
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

                    <div className="text-center px-2">
                      <h1 className="text-xl font-black text-slate-900 underline decoration-slate-400 underline-offset-4">
                        {docInfo.name}
                      </h1>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">{docInfo.shortDesc}</p>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        <span>תאריך: </span>
                        <span className="font-semibold text-slate-800">{todayStr}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/logos/israel_emblem.png"
                        alt="סמל מדינת ישראל"
                        className="h-14 w-auto object-contain"
                      />
                    </div>
                  </div>

                  {docInfo.lawReference && (
                    <div className="text-center text-[10px] text-blue-800 font-semibold bg-blue-50/70 py-1 px-3 rounded-lg border border-blue-200">
                      בסיס חוקי ומנהלי: {docInfo.lawReference}
                    </div>
                  )}
                </div>
              )}

              {/* Candidate Info Box for doc_2 through doc_9 */}
              {docTypeId !== "doc_1" && (
                <div className="pdf-section bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs" data-pdf-section="candidate-details">
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    פרטי המועמד/ת והשיוך
                  </h2>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <span className="text-slate-500 block text-[10px]">שם מלא:</span>
                      <span className="font-bold text-slate-900">{candidate.full_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">תעודת זהות:</span>
                      <span className="font-mono font-bold text-slate-900">{candidate.id_number}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">פרויקט:</span>
                      <span className="font-semibold text-slate-900">{candidate.project_id}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">חברת ספק:</span>
                      <span className="font-semibold text-slate-900">
                        {candidate.vendor_company_name || candidate.vendor_id}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Document Specific Content Rendered in authentic A4 format */}
              {docTypeId === "doc_1" && (
                <Doc1PersonalQuestionnairePdf
                  candidate={candidate}
                  todayStr={todayStr}
                  signatureDataUrl={signatureDataUrl}
                  firstName={q1FirstName}
                  lastName={q1LastName}
                  firstNameEn={q1FirstNameEn}
                  lastNameEn={q1LastNameEn}
                  fatherName={q1FatherName}
                  prevLastName={q1PrevLastName}
                  gender={q1Gender}
                  religion={q1Religion}
                  birthDate={q1BirthDate}
                  birthCountry={q1BirthCountry}
                  aliyahYear={q1AliyahYear}
                  maritalStatus={q1MaritalStatus}
                  otherCitizenship={q1OtherCitizenship}
                  city={q1City}
                  street={q1Street}
                  houseNumber={q1HouseNumber}
                  zipCode={q1ZipCode}
                  homePhone={q1HomePhone}
                  mobilePhone={q1MobilePhone}
                />
              )}

              {docTypeId === "doc_4" && (
                <Doc4CriminalRecordConsentPdf
                  candidate={candidate}
                  fatherName={q4FatherName}
                  address={q4Address || `${q1City} ${q1Street} ${q1HouseNumber}`.trim()}
                  docInfo={docInfo}
                />
              )}

              {docTypeId === "doc_9" && (
                <Doc9SmartCardRequestPdf
                  candidate={candidate}
                  nameEn={q9NameEn}
                  roleInProject={q9RoleInProject}
                  managerName={q9ManagerName}
                  startDate={q9StartDate}
                  previousGov={q9PreviousGov}
                  previousDates={q9PreviousDates}
                  docInfo={docInfo}
                />
              )}

              {["doc_2", "doc_3", "doc_5", "doc_6", "doc_7", "doc_8"].includes(docTypeId) && (
                <DocClausesPdf docInfo={docInfo} />
              )}

              {/* Signature Block for doc_2 through doc_9 */}
              {docTypeId !== "doc_1" && (
                <div className="pdf-section pt-4 border-t border-slate-200 space-y-4" data-pdf-section="signature-footer">
                  <div className="text-xs text-slate-700 leading-relaxed font-medium">
                    ☑ הנני מאשר/ת בחתימתי כי קראתי בעיון את כל סעיפי המסמך, הבנתי את תוכנו ומשמעותו המשפטית,
                    והפרטים שנמסרו על ידי נכונים ומלאים.
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2">
                    <div className="space-y-1">
                      <span className="text-slate-500 block">שם החותם/ת:</span>
                      <span className="font-bold text-slate-900 text-sm">{candidate.full_name}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-500 block">תאריך:</span>
                      <span className="font-mono font-bold text-slate-900">{todayStr}</span>
                    </div>
                    <div className="space-y-1 text-center">
                      <span className="text-slate-500 block">חתימה דיגיטלית:</span>
                      <div className="h-12 w-44 border-b border-slate-400 flex items-center justify-center">
                        {signatureDataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={signatureDataUrl}
                            alt="חתימה"
                            className="h-11 w-auto max-w-[150px] object-contain"
                          />
                        ) : (
                          <span className="text-slate-400 text-xs italic">[חתום דיגיטלית]</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Official Government Footer */}
                  <div className="pt-4 border-t-2 border-slate-900 flex items-center justify-between text-[10px] text-slate-600 font-mono">
                    <div>אוצר ברשת: www.mof.gov.il | רח' יפו 234 ירושלים</div>
                    <div>טופס רשמי מרכב"ה | עמוד 1 מתוך 1</div>
                    <div>שער הממשלה: www.gov.il</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Action Bar for Phase 2 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => {
                setIsPreviewMode(false);
                if (typeof window !== "undefined") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition disabled:opacity-50"
            >
              <Edit3 className="w-4 h-4 text-slate-500" />
              <span>חזרה לעריכת פרטים</span>
            </button>

            <button
              type="button"
              onClick={handleApproveAndSave}
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>מפיק PDF רשמי ושומר ב-Google Drive...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    {isEmbeddedInPortal && nextDocTypeId
                      ? "אשר, שמור והמשך לטופס הבא"
                      : "אשר ושמור מסמך ב-Google Drive"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// DEDICATED INPUT FORMS (PHASE 1)
// -----------------------------------------------------------------------------

function Doc1DedicatedInputForm({
  firstName,
  setFirstName,
  lastName,
  setLastName,
  firstNameEn,
  setFirstNameEn,
  lastNameEn,
  setLastNameEn,
  fatherName,
  setFatherName,
  prevLastName,
  setPrevLastName,
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
  maritalStatus,
  setMaritalStatus,
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
  candidatePhone,
  candidateEmail,
}: any) {
  return (
    <div className="space-y-6">
      {/* Section 1: Personal Details */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-2">
          חלק א': פרטים אישיים
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs sm:text-sm">
          <div>
            <label className="font-bold text-slate-700 block mb-1">שם משפחה בעברית *</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="משפחה"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 font-bold"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">שם פרטי בעברית *</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="פרטי"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 font-bold"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">שם האב</label>
            <input
              type="text"
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
              placeholder="שם פרטי של האב"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">שם משפחה קודם/נוסף</label>
            <input
              type="text"
              value={prevLastName}
              onChange={(e) => setPrevLastName(e.target.value)}
              placeholder="אם קיים"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">שם משפחה באנגלית (Last Name)</label>
            <input
              type="text"
              value={lastNameEn}
              onChange={(e) => setLastNameEn(e.target.value)}
              placeholder="Last Name"
              dir="ltr"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">שם פרטי באנגלית (First Name)</label>
            <input
              type="text"
              value={firstNameEn}
              onChange={(e) => setFirstNameEn(e.target.value)}
              placeholder="First Name"
              dir="ltr"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">מין</label>
            <div className="flex gap-4 p-2 bg-slate-50 rounded-xl border border-slate-200">
              <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-xs">
                <input
                  type="radio"
                  name="q1GenderInput"
                  value="זכר"
                  checked={gender === "זכר"}
                  onChange={() => setGender("זכר")}
                />
                <span>זכר</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-xs">
                <input
                  type="radio"
                  name="q1GenderInput"
                  value="נקבה"
                  checked={gender === "נקבה"}
                  onChange={() => setGender("נקבה")}
                />
                <span>נקבה</span>
              </label>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">דת</label>
            <input
              type="text"
              value={religion}
              onChange={(e) => setReligion(e.target.value)}
              placeholder="יהודי/ת"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">תאריך לידה (DD/MM/YYYY)</label>
            <input
              type="text"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              placeholder="למשל 15/05/1990"
              dir="ltr"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">ארץ לידה</label>
            <input
              type="text"
              value={birthCountry}
              onChange={(e) => setBirthCountry(e.target.value)}
              placeholder="ישראל"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">שנת עלייה (אם רלוונטי)</label>
            <input
              type="text"
              value={aliyahYear}
              onChange={(e) => setAliyahYear(e.target.value)}
              placeholder="יליד הארץ"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">אזרחות נוספת או מעמד תושב קבע</label>
            <input
              type="text"
              value={otherCitizenship}
              onChange={(e) => setOtherCitizenship(e.target.value)}
              placeholder="ללא"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Address & Contact */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-2">
          חלק ב': כתובת נוכחית ופרטי התקשרות
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs sm:text-sm">
          <div>
            <label className="font-bold text-slate-700 block mb-1">ישוב / עיר</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="שם הישוב"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 font-bold"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">שם רחוב</label>
            <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="רחוב"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">מספר בית / דירה</label>
            <input
              type="text"
              value={houseNumber}
              onChange={(e) => setHouseNumber(e.target.value)}
              placeholder="מספר"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">מיקוד</label>
            <input
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              placeholder="מיקוד"
              dir="ltr"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">טלפון נייד (פורמט ישראלי אחיד)</label>
            <input
              type="text"
              value={mobilePhone}
              onChange={(e) => setMobilePhone(e.target.value)}
              onBlur={() => setMobilePhone(formatIsraeliPhone(mobilePhone || candidatePhone))}
              placeholder="05X-XXXXXXX"
              dir="ltr"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 font-mono font-bold"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">טלפון בבית</label>
            <input
              type="text"
              value={homePhone}
              onChange={(e) => setHomePhone(e.target.value)}
              onBlur={() => setHomePhone(formatIsraeliPhone(homePhone))}
              placeholder="0X-XXXXXXX"
              dir="ltr"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div className="md:col-span-2">
            <label className="font-bold text-slate-700 block mb-1">דואר אלקטרוני</label>
            <input
              type="email"
              value={candidateEmail}
              disabled
              dir="ltr"
              className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-slate-50 font-mono text-slate-700"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Doc4DedicatedInputForm({
  fatherName,
  setFatherName,
  address,
  setAddress,
  docInfo,
}: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-2">
          פרטים להסכמה למסירת מידע מן המרשם הפלילי
        </h3>
        <p className="text-xs text-slate-600">
          בהתאם לחוק המידע הפלילי ותקנת השבים, התשע"ט-2019, נדרש לציין את שם האב וכתובת המגורים העדכנית לצורך אימות מול משטרת ישראל.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div>
            <label className="font-bold text-slate-700 block mb-1">שם האב *</label>
            <input
              type="text"
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
              placeholder="שם פרטי של האב"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 font-bold"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">כתובת מגורים עדכנית ומלאה *</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="עיר, רחוב ומספר בית"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 font-bold"
              required
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-3">
        <h4 className="font-bold text-sm text-slate-900">
          תקציר נוסח כתב הויתור וההסכמה
        </h4>
        <div className="space-y-2 text-xs text-slate-700 leading-relaxed max-h-48 overflow-y-auto pr-1">
          {docInfo.fullContent.map((clause: string, i: number) => (
            <p key={i}>{clause}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function Doc9DedicatedInputForm({
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
  candidate,
}: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-2">
          פרטים להנפקת כרטיס חכם / תג עובד
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div>
            <label className="font-bold text-slate-700 block mb-1">שם פרטי ומשפחה באנגלית (Full Name in English)</label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="First and Last Name in English"
              dir="ltr"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 font-bold"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">תפקיד מיועד בפרויקט *</label>
            <input
              type="text"
              value={roleInProject}
              onChange={(e) => setRoleInProject(e.target.value)}
              placeholder="למשל: יועץ אבטחת מידע / מפתח Fullstack"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 font-bold"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">שם מנהל ישיר / מוביל פרויקט מאשר</label>
            <input
              type="text"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              placeholder="שם מלא של המנהל/ת"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">תאריך תחילת העסקה</label>
            <input
              type="text"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="DD/MM/YYYY"
              dir="ltr"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="font-bold text-slate-700 block mb-1">
              העסקה קודמת במשרד ממשלתי
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={previousGov}
                onChange={(e) => setPreviousGov(e.target.value)}
                className="border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 font-bold"
              >
                <option value="לא">לא</option>
                <option value="כן">כן</option>
              </select>

              {previousGov === "כן" && (
                <input
                  type="text"
                  value={previousDates}
                  onChange={(e) => setPreviousDates(e.target.value)}
                  placeholder="פרט משרד ושנים (למשל: משרד המשפטים, 2021-2023)"
                  className="flex-1 border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocClausesDedicatedInputForm({ docInfo }: { docInfo: FullDocumentInfo }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
      <h3 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-2">
        סעיפי המסמך וההתחייבות
      </h3>
      <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed max-h-96 overflow-y-auto pr-2">
        {docInfo.fullContent.map((clause, idx) => (
          <div key={idx} className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            {clause}
          </div>
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// AUTHENTIC A4 PDF RENDERERS (PHASE 2 - CAPTURED BY HTML2CANVAS)
// -----------------------------------------------------------------------------

function Doc1PersonalQuestionnairePdf({
  candidate,
  todayStr,
  signatureDataUrl,
  firstName,
  lastName,
  firstNameEn,
  lastNameEn,
  fatherName,
  prevLastName,
  gender,
  religion,
  birthDate,
  birthCountry,
  aliyahYear,
  maritalStatus,
  otherCitizenship,
  city,
  street,
  houseNumber,
  zipCode,
  homePhone,
  mobilePhone,
}: any) {
  const rawId: string = String(candidate?.id_number || "").replace(/\D/g, "");
  const paddedId: string = rawId.padStart(9, "0").slice(-9);
  const idDigits: string[] = paddedId.split("");

  return (
    <div className="space-y-2 text-slate-900 bg-white" dir="rtl" data-single-page="true">
      {/* 1. Security Warning Box */}
      <div className="border-2 border-slate-900 py-1 px-2 text-center text-xs font-bold text-slate-900 leading-tight">
        מסמך זה מכיל מידע לצורך הליך של הגנת סודיות. כל המוסרו שלא כדין עובר עבירה
      </div>

      {/* 2. Emblem and Header */}
      <div className="flex flex-col items-center justify-center text-center space-y-0.5 pt-0.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logos/israel_emblem.png"
          alt="סמל מדינת ישראל"
          className="h-10 w-auto object-contain mx-auto"
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

      {/* 3. Routing Line */}
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
              <th className="border border-slate-900 p-1 w-[11%] text-center font-bold"> </th>
              <th className="border border-slate-900 p-1 w-[22%] text-center font-bold">שם משפחה</th>
              <th className="border border-slate-900 p-1 w-[22%] text-center font-bold">שם פרטי</th>
              <th className="border border-slate-900 p-1 w-[20%] text-center font-bold">שם אב</th>
              <th className="border border-slate-900 p-1 w-[25%] text-center font-bold">שם משפחה קודם/נוסף</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td rowSpan={2} className="border border-slate-900 p-1 text-center font-bold bg-slate-50 align-middle">
                נוכחי
              </td>
              <td className="border border-slate-900 p-1 text-center align-middle">
                <span className="text-[9px] text-slate-500 block text-right pr-0.5">בעברית:</span>
                <div className="w-full text-center font-bold text-slate-900 text-xs sm:text-sm h-7 leading-7 flex items-center justify-center">
                  {lastName || "-"}
                </div>
              </td>
              <td className="border border-slate-900 p-1 text-center align-middle">
                <span className="text-[9px] text-slate-500 block text-right pr-0.5">בעברית:</span>
                <div className="w-full text-center font-bold text-slate-900 text-xs sm:text-sm h-7 leading-7 flex items-center justify-center">
                  {firstName || "-"}
                </div>
              </td>
              <td className="border border-slate-900 p-1 text-center align-middle">
                <span className="text-[9px] text-slate-500 block text-right pr-0.5">בעברית:</span>
                <div className="w-full text-center font-bold text-slate-900 text-xs sm:text-sm h-7 leading-7 flex items-center justify-center">
                  {fatherName || "-"}
                </div>
              </td>
              <td className="border border-slate-900 p-1 text-center align-middle">
                <span className="text-[9px] text-slate-500 block text-right pr-0.5">בעברית:</span>
                <div className="w-full text-center font-bold text-slate-900 text-xs sm:text-sm h-7 leading-7 flex items-center justify-center">
                  {prevLastName || "-"}
                </div>
              </td>
            </tr>
            <tr>
              <td className="border border-slate-900 p-1 text-center align-middle">
                <span className="text-[9px] text-slate-500 block text-right pr-0.5">בלועזית:</span>
                <div className="w-full text-center font-bold text-slate-900 text-xs sm:text-sm h-7 leading-7 flex items-center justify-center" dir="ltr">
                  {lastNameEn || "-"}
                </div>
              </td>
              <td className="border border-slate-900 p-1 text-center align-middle">
                <span className="text-[9px] text-slate-500 block text-right pr-0.5">בלועזית:</span>
                <div className="w-full text-center font-bold text-slate-900 text-xs sm:text-sm h-7 leading-7 flex items-center justify-center" dir="ltr">
                  {firstNameEn || "-"}
                </div>
              </td>
              <td className="border border-slate-900 p-1 text-center align-middle bg-slate-50/40">
                <span className="text-[9px] text-slate-400 block text-right pr-0.5">בלועזית:</span>
                <span className="text-slate-300 block h-7 leading-7">-</span>
              </td>
              <td className="border border-slate-900 p-1 text-center align-middle bg-slate-50/40">
                <span className="text-[9px] text-slate-400 block text-right pr-0.5">בלועזית:</span>
                <span className="text-slate-300 block h-7 leading-7">-</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Table 2: ID Digits & Gender */}
        <table className="w-full border-collapse border border-slate-900 text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-900">
              <th className="border border-slate-900 p-1 text-center font-bold" style={{ width: "44%" }}>
                מס' זהות
              </th>
              <th className="border border-slate-900 p-1 text-center font-bold" style={{ width: "36%" }}>
                מס' זיהוי קודם/נוסף
              </th>
              <th className="border border-slate-900 p-1 text-center font-bold" style={{ width: "20%" }}>
                מין
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-900 p-1.5 text-center align-middle min-h-[44px]">
                <div className="flex items-center justify-center gap-1" dir="ltr">
                  {idDigits.map((digit: string, i: number) => (
                    <div
                      key={i}
                      className="w-7 h-7 sm:w-8 sm:h-8 border border-slate-900 flex items-center justify-center font-mono font-bold text-xs sm:text-sm text-slate-900 bg-white"
                    >
                      {digit}
                    </div>
                  ))}
                </div>
              </td>
              <td className="border border-slate-900 p-1.5 text-center align-middle min-h-[44px]">
                <div className="flex items-center justify-center gap-1" dir="ltr">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-7 h-7 sm:w-8 sm:h-8 border border-slate-400 flex items-center justify-center font-mono text-xs text-slate-300 bg-slate-50/50"
                    >
                      {" "}
                    </div>
                  ))}
                </div>
              </td>
              <td className="border border-slate-900 p-1.5 text-center align-middle min-h-[44px]">
                <div className="flex items-center justify-center gap-4 text-xs font-bold">
                  <div className="flex items-center gap-1">
                    <span>{gender === "זכר" ? "☒" : "☐"}</span>
                    <span>זכר</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{gender === "נקבה" ? "☒" : "☐"}</span>
                    <span>נקבה</span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Table 3: Religion, Birth Date, Birth Country, Aliyah, Other Citizenship */}
        <table className="w-full border-collapse border border-slate-900 text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-900">
              <th className="border border-slate-900 p-1 text-center font-bold" style={{ width: "13%" }}>דת</th>
              <th className="border border-slate-900 p-1 text-center font-bold" style={{ width: "17%" }}>תאריך לידה</th>
              <th className="border border-slate-900 p-1 text-center font-bold" style={{ width: "17%" }}>ארץ לידה</th>
              <th className="border border-slate-900 p-1 text-center font-bold" style={{ width: "15%" }}>תאריך עליה</th>
              <th className="border border-slate-900 p-1 text-center font-bold" style={{ width: "38%" }}>
                אזרחות נוספת או מעמד של תושב קבע
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-900 p-1.5 text-center align-middle min-h-[46px]">
                <div className="font-bold text-slate-900 text-xs">
                  {religion || "יהודי/ת"}
                </div>
              </td>
              <td className="border border-slate-900 p-1.5 text-center align-middle min-h-[46px]">
                <div className="font-bold text-slate-900 text-xs font-mono" dir="ltr">
                  {birthDate || "-"}
                </div>
              </td>
              <td className="border border-slate-900 p-1.5 text-center align-middle min-h-[46px]">
                <div className="font-bold text-slate-900 text-xs">
                  {birthCountry || "ישראל"}
                </div>
              </td>
              <td className="border border-slate-900 p-1.5 text-center align-middle min-h-[46px]">
                <div className="font-bold text-slate-900 text-xs">
                  {aliyahYear || "יליד הארץ"}
                </div>
              </td>
              <td className="border border-slate-900 p-1.5 text-center align-middle min-h-[46px]">
                <div className="font-bold text-slate-900 text-xs">
                  {otherCitizenship || "ללא"}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 5. חלק ב' - שירותי תקשורת וכתובת */}
      <div className="space-y-1">
        <div className="font-bold text-xs sm:text-sm text-slate-900">
          חלק ב' - שירותי תקשורת
        </div>
        <div className="text-[11px] font-bold text-slate-800">
          כתובת נוכחית
        </div>

        <table className="w-full border-collapse border border-slate-900 text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-900">
              <th className="border border-slate-900 p-1 text-center font-bold" style={{ width: "18%" }}>ישוב</th>
              <th className="border border-slate-900 p-1 text-center font-bold" style={{ width: "28%" }}>רחוב</th>
              <th className="border border-slate-900 p-1 text-center font-bold" style={{ width: "10%" }}>מס' בית/דירה</th>
              <th className="border border-slate-900 p-1 text-center font-bold" style={{ width: "10%" }}>מיקוד</th>
              <th className="border border-slate-900 p-1 text-center font-bold" style={{ width: "17%" }}>טלפון בבית</th>
              <th className="border border-slate-900 p-1 text-center font-bold" style={{ width: "17%" }}>נייד</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-900 p-1.5 text-center align-middle min-h-[44px]">
                <div className="font-bold text-slate-900 text-xs">{city || "-"}</div>
              </td>
              <td className="border border-slate-900 p-1.5 text-center align-middle min-h-[44px]">
                <div className="font-bold text-slate-900 text-xs">{street || "-"}</div>
              </td>
              <td className="border border-slate-900 p-1.5 text-center align-middle min-h-[44px]">
                <div className="font-bold text-slate-900 text-xs">{houseNumber || "-"}</div>
              </td>
              <td className="border border-slate-900 p-1.5 text-center align-middle min-h-[44px]">
                <div className="font-mono font-bold text-slate-900 text-xs" dir="ltr">{zipCode || "-"}</div>
              </td>
              <td className="border border-slate-900 p-1.5 text-center align-middle min-h-[44px]">
                <div className="font-mono font-bold text-slate-900 text-xs" dir="ltr">{homePhone || "-"}</div>
              </td>
              <td className="border border-slate-900 p-1.5 text-center align-middle min-h-[44px]">
                <div className="font-mono font-bold text-slate-900 text-xs" dir="ltr">
                  {mobilePhone || formatIsraeliPhone(candidate.phone) || "-"}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Email Full-Width Row */}
        <div className="border border-slate-900 py-1 px-3 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800">כתובת דואר אלקטרוני:</span>
          <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm" dir="ltr">
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
            <div className="h-10 sm:h-11 w-44 border-b border-slate-900 flex items-center justify-center">
              {signatureDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signatureDataUrl}
                  alt="חתימת המועמד/ת"
                  className="h-9 sm:h-10 w-auto max-w-[140px] object-contain"
                />
              ) : (
                <span className="text-[10px] text-slate-400 italic">
                  [מאומת ונחתם דיגיטלית]
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 6. חלק ג' - מילוי המשרד המקצועי */}
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
              <th className="border border-slate-900 p-1 text-center font-bold" style={{ width: "26%" }}>
                תפקיד
              </th>
              <th className="border border-slate-900 p-1 text-center font-bold" style={{ width: "22%" }}>
                מעמד
              </th>
              <th className="border border-slate-900 p-1 text-center font-bold" style={{ width: "22%" }}>
                היבטי אבטחה
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-900 p-1.5 text-center align-middle font-bold text-slate-900 text-xs">
                <div className="break-words whitespace-normal text-xs font-bold leading-snug py-1">
                  {candidate.vendor_company_name || candidate.vendor_id || candidate.project_id}
                </div>
              </td>
              <td className="border border-slate-900 p-1.5 text-center align-middle font-bold text-slate-900 text-xs">
                <div className="break-words whitespace-normal text-xs font-bold leading-snug py-1">
                  יועץ / מומחה ({candidate.project_id})
                </div>
              </td>
              <td className="border border-slate-900 p-1.5 align-middle">
                <div className="grid grid-cols-2 gap-0.5 text-[10px] text-right font-medium">
                  <div className="flex items-center gap-1"><span className="font-bold">☒</span> קבוע</div>
                  <div className="flex items-center gap-1"><span className="font-bold">☐</span> זמני</div>
                  <div className="flex items-center gap-1"><span className="font-bold">☐</span> עובד</div>
                  <div className="flex items-center gap-1"><span className="font-bold">☒</span> קבלן</div>
                  <div className="flex items-center gap-1 col-span-2"><span className="font-bold">☐</span> אחר: _____</div>
                </div>
              </td>
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

        <div className="text-[11px] font-bold text-slate-900 pt-0.5">
          <span>הערות: </span>
          <span className="font-normal underline decoration-dotted underline-offset-4">
            שאלון רמה 5 הוגש ונבדק דיגיטלית במערכת Onboarding Checklist
          </span>
        </div>
      </div>

      {/* 7. חלק ד' - אימות פרטים */}
      <div className="space-y-1">
        <div className="font-bold text-xs sm:text-sm text-slate-900">
          חלק ד' - אימות פרטים (ימולא ע"י קצין ביטחון)
        </div>

        <div className="border border-slate-900 p-2 space-y-1 text-xs">
          <p className="font-medium text-slate-900 leading-tight text-[11px]">
            אני מצהיר/ה בזאת כי בדקתי את זהות המועמד/ת לשאלון והפרטים שמולאו ולם נמצאו נכונים לפי המסמכים המוצגים הבאים:
          </p>

          <div className="grid grid-cols-3 gap-1 text-[11px] font-semibold text-slate-900">
            <div className="flex items-center gap-1"><span className="font-bold">☒</span> תעודת זהות</div>
            <div className="flex items-center gap-1"><span className="font-bold">☒</span> רישיון נהיגה</div>
            <div className="flex items-center gap-1"><span className="font-bold">☒</span> כתב ויתור סודיות</div>
          </div>

          <div className="pt-1 border-t border-slate-400 grid grid-cols-4 gap-2 text-center text-[10px] font-bold text-slate-900">
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
        <div className="text-center font-bold text-slate-900">- עמוד 1 מתוך 1 -</div>
        <div className="opacity-0">טופס 138/01</div>
      </div>
    </div>
  );
}

function Doc4CriminalRecordConsentPdf({
  candidate,
  fatherName,
  address,
  docInfo,
}: any) {
  return (
    <div className="pdf-section space-y-4 text-sm leading-relaxed border border-slate-200 rounded-xl p-6 bg-slate-50/40" data-pdf-section="consent-form">
      <h3 className="font-bold text-slate-900 text-base border-b pb-2">
        כתב הסכמה למסירת מידע מן המרשם הפלילי (ויתור סודיות)
      </h3>

      <div className="grid grid-cols-2 gap-4 text-xs pb-3 border-b">
        <div>
          <span className="font-semibold block mb-1 text-slate-600">שם האב:</span>
          <div className="p-2 border-b border-slate-900 font-bold text-slate-900 text-center">
            {fatherName || "-"}
          </div>
        </div>
        <div>
          <span className="font-semibold block mb-1 text-slate-600">כתובת מגורים עדכנית:</span>
          <div className="p-2 border-b border-slate-900 font-bold text-slate-900 text-center">
            {address || "-"}
          </div>
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

function Doc9SmartCardRequestPdf({
  candidate,
  nameEn,
  roleInProject,
  managerName,
  startDate,
  previousGov,
  previousDates,
  docInfo,
}: any) {
  return (
    <div className="space-y-4 text-sm text-slate-900">
      <div className="pdf-section space-y-3 bg-slate-50/60 p-5 rounded-2xl border border-slate-200" data-pdf-section="fields-table">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="font-bold text-slate-700 block mb-1">שם פרטי ומשפחה:</span>
            <div className="p-2 bg-white border-b-2 border-slate-400 font-bold text-slate-900 rounded-t text-center">
              {candidate.full_name}
            </div>
          </div>
          <div>
            <span className="font-bold text-slate-700 block mb-1">שם פרטי ומשפחה באנגלית:</span>
            <div className="p-2 bg-white border-b-2 border-slate-400 font-bold text-slate-900 rounded-t text-center" dir="ltr">
              {nameEn || "-"}
            </div>
          </div>

          <div>
            <span className="font-bold text-slate-700 block mb-1">מספר תעודת זהות:</span>
            <div className="p-2 bg-white border-b-2 border-slate-400 font-mono font-bold text-slate-900 rounded-t text-center">
              {candidate.id_number}
            </div>
          </div>
          <div>
            <span className="font-bold text-slate-700 block mb-1">תפקיד מיועד:</span>
            <div className="p-2 bg-white border-b-2 border-slate-400 font-bold text-slate-900 rounded-t text-center">
              {roleInProject || "-"}
            </div>
          </div>

          <div>
            <span className="font-bold text-slate-700 block mb-1">דואר אלקטרוני:</span>
            <div className="p-2 bg-white border-b-2 border-slate-400 font-mono font-bold text-slate-900 rounded-t text-center" dir="ltr">
              {candidate.email}
            </div>
          </div>
          <div>
            <span className="font-bold text-slate-700 block mb-1">סוג העסקה:</span>
            <div className="p-2 bg-white border-b-2 border-slate-400 font-semibold text-slate-800 rounded-t text-center">
              עובד קבלן / מיקור חוץ ({candidate.vendor_company_name || candidate.vendor_id})
            </div>
          </div>

          <div>
            <span className="font-bold text-slate-700 block mb-1">תאריך תחילת העסקה:</span>
            <div className="p-2 bg-white border-b-2 border-slate-400 font-bold text-slate-900 rounded-t text-center" dir="ltr">
              {startDate || "-"}
            </div>
          </div>
          <div>
            <span className="font-bold text-slate-700 block mb-1">העסקה במשרד ממשלתי קודם:</span>
            <div className="p-2 bg-white border-b-2 border-slate-400 font-bold text-slate-900 rounded-t text-center">
              {previousGov === "כן" ? `כן (${previousDates || "ללא ציון תאריכים"})` : "לא"}
            </div>
          </div>
        </div>
      </div>

      <div className="pdf-section border border-slate-200 rounded-xl p-4 bg-white space-y-2 text-xs" data-pdf-section="candidate-decl">
        <h4 className="font-black text-sm text-slate-900 border-b pb-1">
          הצהרת מבקש/ת התעודה
        </h4>
        <p className="text-slate-700 leading-relaxed">
          הנני מאשר/ת בזאת שכל הפרטים שמסרתי נכונים ומאשר/ת את מסירת המידע הנ"ל למרכז להנפקת תעודות.
        </p>
      </div>

      <div className="pdf-section border border-slate-200 rounded-xl p-4 bg-white space-y-2 text-xs" data-pdf-section="rep-decl">
        <h4 className="font-black text-sm text-slate-900 border-b pb-1">
          הצהרת נציג היחידה / מנהל פרויקט
        </h4>
        <p className="text-slate-700 leading-relaxed">
          הנני מאשר/ת שמר/גב' <strong>{candidate.full_name}</strong> ת.ז. <strong>{candidate.id_number}</strong> חתם/ה בנוכחותי על טופס הבקשה לתעודה.
        </p>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <span className="text-slate-500 block text-[10px]">מנהל/ת מאשר/ת:</span>
            <span className="font-bold text-slate-900">{managerName || "מנהל/ת פרויקט"}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">סטטוס:</span>
            <span className="font-semibold text-emerald-700">מאושר מנהלתית</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocClausesPdf({ docInfo }: { docInfo: FullDocumentInfo }) {
  return (
    <div className="pdf-section space-y-3 text-sm leading-relaxed border border-slate-200 rounded-xl p-5 bg-slate-50/40" data-pdf-section="clauses">
      <h3 className="font-bold text-slate-900 text-sm border-b pb-2">
        סעיפי ההצהרה והתנאים
      </h3>
      <div className="space-y-2.5 text-slate-700 text-xs">
        {docInfo.fullContent.map((clause, idx) => (
          <p key={idx} className="pdf-section leading-relaxed" data-pdf-section={`clause-${idx}`}>
            {clause}
          </p>
        ))}
      </div>
    </div>
  );
}
