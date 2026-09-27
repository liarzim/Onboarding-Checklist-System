"use client";

import { useState } from "react";
import {
  User,
  MapPin,
  Shield,
  GraduationCap,
  Briefcase,
  ChevronDown,
  ChevronUp,
  FileText,
  Calendar,
  Phone,
  CheckCircle2,
} from "lucide-react";

interface CandidateFilledDetailsProps {
  candidateDetails?: any;
  candidateName?: string;
}

export default function CandidateFilledDetailsCard({
  candidateDetails,
  candidateName,
}: CandidateFilledDetailsProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"personal" | "address" | "military" | "career">("personal");

  // Normalize details if string
  let details: Record<string, any> = {};
  if (candidateDetails) {
    if (typeof candidateDetails === "string") {
      try {
        details = JSON.parse(candidateDetails);
      } catch {
        details = {};
      }
    } else if (typeof candidateDetails === "object") {
      details = candidateDetails;
    }
  }

  // Count how many profile fields are filled
  const keys = Object.keys(details).filter(
    (k) => details[k] !== undefined && details[k] !== null && details[k] !== ""
  );
  const hasData = keys.length > 0;

  if (!hasData) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              פרטי שאלון וטפסים שמולאו
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              המועמד/ת טרם מילא/ה פרטים בטפסים הדיגיטליים. נתונים שיוזנו בשאלונים יישמרו ויסונכרנו כאן אוטומטית.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition">
      {/* Header bar with toggle */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 select-none border-b border-slate-100"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                פרטי מועמד מורחבים שמולאו בטפסים
              </h3>
              <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                {keys.length} שדות שמורים
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              נתונים אישיים, כתובת, שירות צבאי ותעסוקה שנשמרו ומסונכרנים בין כלל הטפסים
            </p>
          </div>
        </div>

        <button
          type="button"
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
        >
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {isOpen && (
        <div className="p-5 space-y-4">
          {/* Navigation tabs */}
          <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("personal")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                activeTab === "personal"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>פרטים אישיים ומשפחה</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("address")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                activeTab === "address"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>כתובת וקשר</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("military")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                activeTab === "military"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>שירות צבאי / לאומי</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("career")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                activeTab === "career"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>השכלה ותעסוקה</span>
            </button>
          </div>

          {/* Tab 1: Personal */}
          {activeTab === "personal" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
              <DetailItem label="שם פרטי" value={details.first_name || details.q1FirstName} />
              <DetailItem label="שם משפחה" value={details.last_name || details.q1LastName} />
              <DetailItem label="שם באנגלית" value={details.name_en || details.q1NameEn || details.q9NameEn} dir="ltr" />
              <DetailItem label="שם האב" value={details.father_name || details.q1FatherName || details.q4FatherName} />
              <DetailItem label="שם משפחה קודם" value={details.prev_last_name || details.q1PrevLastName} />
              <DetailItem label="תאריך לידה" value={details.birth_date || details.q1BirthDate} />
              <DetailItem label="ארץ לידה" value={details.birth_country || details.q1BirthCountry} />
              <DetailItem label="שנת עלייה" value={details.aliyah_year || details.q1AliyahYear} />
              <DetailItem label="מצב משפחתי" value={details.marital_status || details.q1MaritalStatus} />
              <DetailItem label="מין" value={details.gender || details.q1Gender} />
              <DetailItem label="דת" value={details.religion || details.q1Religion} />
              <DetailItem label="אזרחות נוספת" value={details.other_citizenship || details.q1OtherCitizenship} />
            </div>
          )}

          {/* Tab 2: Address & Contact */}
          {activeTab === "address" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
              <DetailItem label="כתובת מגורים מלאה" value={details.address || details.q1Address || details.q4Address} />
              <DetailItem label="ישוב / עיר" value={details.city || details.q1City} />
              <DetailItem label="רחוב" value={details.street || details.q1Street} />
              <DetailItem label="מספר בית" value={details.house_number || details.q1HouseNumber} />
              <DetailItem label="מיקוד" value={details.zip_code || details.q1ZipCode} />
              <DetailItem label="טלפון נייד" value={details.phone || details.mobile_phone || details.q1MobilePhone} dir="ltr" />
              <DetailItem label="טלפון בבית" value={details.home_phone || details.q1HomePhone} dir="ltr" />
            </div>
          )}

          {/* Tab 3: Military Service */}
          {activeTab === "military" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
              <DetailItem label="סוג שירות" value={details.army_service || details.q1ArmyService} />
              <DetailItem label="מספר אישי / צבאי" value={details.military_id || details.q1MilitaryId} />
              <DetailItem label="תפקיד בשירות" value={details.military_role || details.q1MilitaryRole} />
              <DetailItem label="שנות שירות" value={details.military_years || details.q1MilitaryYears} />
              <DetailItem label="סיבת פטור (במידה ויש)" value={details.exemption_reason || details.q1ExemptionReason} />
            </div>
          )}

          {/* Tab 4: Career & Education */}
          {activeTab === "career" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
              <DetailItem label="השכלה תיכונית" value={details.education_high || details.q1EducationHigh} />
              <DetailItem label="השכלה אקדמית" value={details.education_academic || details.q1EducationAcademic} />
              <DetailItem label="תפקיד בפרויקט" value={details.role_in_project || details.q9RoleInProject} />
              <DetailItem label="מנהל ישיר" value={details.manager_name || details.q9ManagerName} />
              <DetailItem label="תאריך תחילת עבודה" value={details.start_date || details.q9StartDate} />
              <DetailItem label="שירות קודם במדינה" value={details.previous_gov || details.q9PreviousGov} />
              <DetailItem label="תקופות שירות קודמות" value={details.previous_dates || details.q9PreviousDates} />
              <DetailItem label="מקום עבודה 1" value={details.workplace1 || details.q1Workplace1} />
              <DetailItem label="מקום עבודה 2" value={details.workplace2 || details.q1Workplace2} />
              <DetailItem label="ממליץ 1" value={details.ref1 || details.q1Ref1} />
              <DetailItem label="ממליץ 2" value={details.ref2 || details.q1Ref2} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailItem({
  label,
  value,
  dir,
}: {
  label: string;
  value?: string | number | null;
  dir?: "rtl" | "ltr";
}) {
  const displayVal = value !== undefined && value !== null && String(value).trim() !== "" ? String(value) : null;

  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between">
      <span className="text-[11px] font-medium text-slate-500 mb-1">{label}</span>
      <span
        dir={dir || "rtl"}
        className={`font-semibold ${
          displayVal ? "text-slate-800" : "text-slate-400 font-normal italic"
        }`}
      >
        {displayVal || "לא צוין"}
      </span>
    </div>
  );
}
