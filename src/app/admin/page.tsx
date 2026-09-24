"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ChevronLeft,
  Loader2,
  FileCheck,
  CreditCard,
  Building,
  RefreshCw,
  UserPlus,
  X,
  Phone,
  Mail,
  User,
  Copy,
  ExternalLink,
} from "lucide-react";
import { validateIsraeliId } from "@/lib/israeliId";

interface CandidateRecord {
  candidate_id: string;
  full_name: string;
  id_number: string;
  email: string;
  phone: string;
  vendor_id: string;
  vendor_name: string;
  project_id: string;
  drive_folder_id: string;
  current_stage_id: string;
  stage_name: string;
  is_completed: boolean;
  uploadedDocs: number;
  totalDocs: number;
  documentsRatio: string;
  completionPercentage: number;
  isReadyForIssuance: boolean;
  created_at: string;
  updated_at: string;
}

interface VendorOption {
  vendor_id: string;
  company_name: string;
}

interface StageOption {
  stage_id: string;
  stage_name: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [stages, setStages] = useState<StageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedStage, setSelectedStage] = useState("");

  // Add Candidate Modal State (HR / Admin)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [creatingCandidate, setCreatingCandidate] = useState(false);
  const [candidateFormError, setCandidateFormError] = useState<string | null>(null);
  const [createdCandidateInfo, setCreatedCandidateInfo] = useState<{
    candidate_id: string;
    full_name: string;
    access_token?: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Israeli ID On-the-fly validation state
  const [idValidationError, setIdValidationError] = useState<string | null>(null);
  const [idTouched, setIdTouched] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    id_number: "",
    vendor_id: "",
    project_id: "",
    email: "",
    phone: "",
  });

  function validateIdField(val: string): boolean {
    const trimmed = val.trim();
    if (!trimmed) {
      setIdValidationError("נא להזין מספר תעודת זהות");
      return false;
    }
    if (!/^\d+$/.test(trimmed)) {
      setIdValidationError("מספר תעודת זהות חייב להכיל ספרות בלבד");
      return false;
    }
    if (trimmed.length > 9) {
      setIdValidationError("מספר תעודת זהות מכיל עד 9 ספרות");
      return false;
    }
    if (!validateIsraeliId(trimmed)) {
      setIdValidationError("מספר תעודת זהות לא תקין (ספרת ביקורת שגויה)");
      return false;
    }
    setIdValidationError(null);
    return true;
  }

  function handleIdChange(value: string) {
    setFormData((prev) => ({ ...prev, id_number: value }));
    if (idTouched) {
      validateIdField(value);
    }
  }

  function handleIdBlur() {
    setIdTouched(true);
    validateIdField(formData.id_number);
  }

  async function handleCreateCandidate(e: React.FormEvent) {
    e.preventDefault();
    setCandidateFormError(null);

    // Validate ID on the fly before sending
    if (!validateIdField(formData.id_number)) {
      setIdTouched(true);
      setCandidateFormError("מספר תעודת זהות אינו תקין לפי ספרת ביקורת ישראלית");
      return;
    }

    setCreatingCandidate(true);

    try {
      const res = await fetch("/api/admin/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "שגיאה ביצירת המועמד");
      }

      setCreatedCandidateInfo(data.candidate);
      setFormData({
        full_name: "",
        id_number: "",
        vendor_id: "",
        project_id: "",
        email: "",
        phone: "",
      });
      await loadData();
    } catch (err) {
      setCandidateFormError(err instanceof Error ? err.message : "שגיאה ביצירת המועמד");
    } finally {
      setCreatingCandidate(false);
    }
  }

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [candidatesRes, metaRes] = await Promise.all([
        fetch("/api/admin/candidates?status=active"),
        fetch("/api/admin/meta"),
      ]);

      if (!candidatesRes.ok) {
        throw new Error("שגיאה בטעינת מועמדים פעילים");
      }
      if (!metaRes.ok) {
        throw new Error("שגיאה בטעינת נתוני מערכת");
      }

      const candidatesData = await candidatesRes.json();
      const metaData = await metaRes.json();

      setCandidates(candidatesData.candidates || []);
      setVendors(metaData.vendors || []);
      setStages(metaData.stages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינה");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("error") === "forbidden") {
        setError("אין לך הרשאת מנהל מערכת (Admin) לביצוע פעולה זו או לצפייה בדף המבוקש.");
      }
    }
  }, []);

  // Compute KPI counts
  const totalActive = candidates.length;
  const pendingDocsCount = candidates.filter((c) => c.uploadedDocs < c.totalDocs).length;
  const inReviewCount = candidates.filter(
    (c) => c.current_stage_id === "stage_2" || c.current_stage_id === "stage_3"
  ).length;
  const readyForIssuanceCount = candidates.filter((c) => c.isReadyForIssuance).length;

  // Unique project list for dropdown
  const uniqueProjects = Array.from(new Set(candidates.map((c) => c.project_id).filter(Boolean)));

  // Filter candidates
  const filteredCandidates = candidates.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      c.full_name.toLowerCase().includes(q) ||
      c.id_number.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q);

    const matchesVendor = !selectedVendor || c.vendor_id === selectedVendor;
    const matchesProject = !selectedProject || c.project_id === selectedProject;
    const matchesStage = !selectedStage || c.current_stage_id === selectedStage;

    return matchesSearch && matchesVendor && matchesProject && matchesStage;
  });

  function getStageBadgeClass(stageId: string): string {
    switch (stageId) {
      case "stage_1":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "stage_2":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "stage_3":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "stage_4":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "stage_completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            לוח בקרת קליטה ומועמדים פעילים
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            מעקב שוטף, בקרת מסמכים לקליטה ואישור הנפקת כרטיס חכם
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => {
              setCreatedCandidateInfo(null);
              setCandidateFormError(null);
              setIdValidationError(null);
              setIdTouched(false);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>הוספת מועמד חדש</span>
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>רענן נתונים</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Candidates */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block">מועמדים פעילים</span>
            <span className="text-2xl font-bold text-slate-900">{totalActive}</span>
          </div>
        </div>

        {/* KPI 2: Pending Documents */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block">ממתינים להשלמת מסמכים</span>
            <span className="text-2xl font-bold text-amber-600">{pendingDocsCount}</span>
          </div>
        </div>

        {/* KPI 3: In Review */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block">בבדיקה (ביטחון / HR)</span>
            <span className="text-2xl font-bold text-purple-600">{inReviewCount}</span>
          </div>
        </div>

        {/* KPI 4: Ready for Issuance */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block">מוכנים להנפקת כרטיס</span>
            <span className="text-2xl font-bold text-emerald-600">{readyForIssuanceCount}</span>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש לפי שם, ת.ז. או אימייל..."
              className="w-full pr-10 pl-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Vendor Filter */}
          <div>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
            >
              <option value="">כל הספקים</option>
              {vendors.map((v) => (
                <option key={v.vendor_id} value={v.vendor_id}>
                  {v.company_name}
                </option>
              ))}
            </select>
          </div>

          {/* Project Filter */}
          <div>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
            >
              <option value="">כל הפרויקטים</option>
              {uniqueProjects.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Stage Filter */}
          <div>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
            >
              <option value="">כל השלבים</option>
              {stages.map((s) => (
                <option key={s.stage_id} value={s.stage_id}>
                  {s.stage_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(searchQuery || selectedVendor || selectedProject || selectedStage) && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span>נמצאו {filteredCandidates.length} תוצאות מסוננות</span>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedVendor("");
                setSelectedProject("");
                setSelectedStage("");
              }}
              className="text-blue-600 hover:underline font-medium"
            >
              איפוס סינונים
            </button>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadData}
            className="text-xs font-semibold underline hover:no-underline"
          >
            נסה שוב
          </button>
        </div>
      )}

      {/* Content Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="text-sm font-medium text-slate-500">
            טוען רשימת מועמדים...
          </span>
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">
            לא נמצאו מועמדים פעילים
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || selectedVendor || selectedProject || selectedStage
              ? "אין תוצאות התואמות את הסינונים שנבחרו."
              : "אין כרגע מועמדים בתהליך קליטה פעיל."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-4 px-6">שם מלא</th>
                  <th className="py-4 px-6">ת.ז.</th>
                  <th className="py-4 px-6">חברת ספק</th>
                  <th className="py-4 px-6">פרויקט</th>
                  <th className="py-4 px-6">שלב נוכחי</th>
                  <th className="py-4 px-6">יחס מסמכים</th>
                  <th className="py-4 px-6">עודכן לאחרונה</th>
                  <th className="py-4 px-6 text-left">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredCandidates.map((candidate) => (
                  <tr
                    key={candidate.candidate_id}
                    onClick={() => router.push(`/admin/candidate/${candidate.candidate_id}`)}
                    className="hover:bg-slate-50/75 transition cursor-pointer"
                  >
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-900">
                        {candidate.full_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {candidate.email}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-slate-700">
                      {candidate.id_number}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>{candidate.vendor_name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                        {candidate.project_id}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStageBadgeClass(
                          candidate.current_stage_id
                        )}`}
                      >
                        {candidate.stage_name}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              candidate.uploadedDocs === candidate.totalDocs
                                ? "bg-emerald-500"
                                : "bg-blue-600"
                            }`}
                            style={{
                              width: `${candidate.completionPercentage}%`,
                            }}
                          />
                        </div>
                        <span className="font-mono text-xs font-semibold text-slate-700">
                          {candidate.documentsRatio}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-500">
                      {new Date(candidate.updated_at).toLocaleDateString("he-IL")}
                    </td>
                    <td className="py-4 px-6 text-left" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/admin/candidate/${candidate.candidate_id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-xs transition"
                      >
                        <span>צפייה בצ&apos;ק-ליסט</span>
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Candidate Modal (HR / Admin) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden text-right">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">הוספת מועמד חדש לקליטה</h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    פתיחת תיק מועמד ע&quot;י משאבי אנוש (HR) ושיוך לספק
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setCreatedCandidateInfo(null);
                }}
                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {createdCandidateInfo ? (
                /* Success View */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                    <div className="flex items-center gap-2 font-bold text-sm text-emerald-900 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>המועמד נוצר בהצלחה ונפתח עבורו תיק קליטה!</span>
                    </div>
                    <p>
                      נוצרה תיקיית Google Drive ייעודית והופקו 11 פריטי הצ&apos;קליסט לקליטה.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">שם המועמד:</span>
                      <span className="font-bold text-slate-900">{createdCandidateInfo.full_name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-500">מזהה מועמד:</span>
                      <span className="font-mono text-slate-700">{createdCandidateInfo.candidate_id}</span>
                    </div>
                  </div>

                  {/* Candidate Portal Link Box */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      קישור אישי לפורטל המועמד (מילוי וחתימה על מסמכים):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={
                          typeof window !== "undefined"
                            ? `${window.location.origin}/portal/${createdCandidateInfo.access_token || createdCandidateInfo.candidate_id}`
                            : `/portal/${createdCandidateInfo.access_token || createdCandidateInfo.candidate_id}`
                        }
                        className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-100 font-mono text-slate-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}/portal/${createdCandidateInfo.access_token || createdCandidateInfo.candidate_id}`;
                          navigator.clipboard.writeText(url);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 3000);
                        }}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        {copiedLink ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>הועתק!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>העתק קישור</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 flex items-center gap-3">
                    <Link
                      href={`/admin/candidate/${createdCandidateInfo.candidate_id}`}
                      className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl text-center transition flex items-center justify-center gap-1.5"
                    >
                      <span>מעבר לתיק המועמד</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setCreatedCandidateInfo(null)}
                      className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                    >
                      הוסף מועמד נוסף
                    </button>
                  </div>
                </div>
              ) : (
                /* Form View */
                <form onSubmit={handleCreateCandidate} className="space-y-4">
                  {candidateFormError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{candidateFormError}</span>
                    </div>
                  )}

                  {/* Vendor Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      שיוך לספק / קליטה ישירה *
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      <select
                        required
                        value={formData.vendor_id}
                        onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                        className="w-full pr-10 pl-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                      >
                        <option value="">-- בחר ספק אחראי --</option>
                        <option value="direct_hire">קליטה ישירה (משרד ממשלתי / פנימי)</option>
                        {vendors.map((v) => (
                          <option key={v.vendor_id} value={v.vendor_id}>
                            {v.company_name} ({v.vendor_id})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      שם מלא של המועמד *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder="למשל: ישראל ישראלי"
                        className="w-full pr-10 pl-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* ID Number */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        מספר תעודת זהות *
                      </label>
                      {idTouched && !idValidationError && formData.id_number && (
                        <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>ת.ז. תקינה ומאומתת</span>
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <CreditCard className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={formData.id_number}
                        onChange={(e) => handleIdChange(e.target.value)}
                        onBlur={handleIdBlur}
                        placeholder="9 ספרות (למשל: 038602207)"
                        className={`w-full pr-10 pl-3 py-2 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 font-mono transition ${
                          idValidationError
                            ? "border-rose-400 focus:ring-rose-500 bg-rose-50/20 text-rose-900"
                            : idTouched && formData.id_number
                            ? "border-emerald-400 focus:ring-emerald-500 bg-emerald-50/20 text-slate-900"
                            : "border-slate-200 focus:ring-blue-500"
                        }`}
                      />
                    </div>
                    {idValidationError && (
                      <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{idValidationError}</span>
                      </p>
                    )}
                  </div>

                  {/* Project ID */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      פרויקט / אגף יעד *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.project_id}
                      onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                      placeholder="למשל: מרכב״ה - תשתיות ומיכון"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Email & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        כתובת אימייל *
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="candidate@example.com"
                          className="w-full pr-10 pl-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        מספר טלפון *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="050-1234567"
                          className="w-full pr-10 pl-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                    >
                      ביטול
                    </button>
                    <button
                      type="submit"
                      disabled={creatingCandidate}
                      className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {creatingCandidate ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>יוצר מועמד ותיקייה...</span>
                        </>
                      ) : (
                        <span>צור מועמד ופתח תהליך</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
