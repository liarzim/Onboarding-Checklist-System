"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  UserPlus,
  Search,
  FileCheck2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  X,
  Building,
  User,
  Phone,
  Mail,
  FolderOpen,
  CheckCircle2,
  CreditCard,
} from "lucide-react";
import { validateIsraeliId } from "@/lib/israeliId";

interface CandidateItem {
  candidate_id: string;
  full_name: string;
  id_number: string;
  email: string;
  phone: string;
  vendor_id: string;
  project_id: string;
  drive_folder_id: string;
  current_stage_id: string;
  is_completed: boolean;
  completionRatio: string;
  completionPercentage: number;
  uploadedDocs: number;
  totalDocs: number;
}

export default function VendorDashboardPage() {
  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Israeli ID On-the-fly validation state
  const [idValidationError, setIdValidationError] = useState<string | null>(null);
  const [idTouched, setIdTouched] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    id_number: "",
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

  async function loadCandidates() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/vendor/candidates");
      if (!res.ok) {
        throw new Error("שגיאה בטעינת רשימת המועמדים");
      }
      const data = await res.json();
      setCandidates(data.candidates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינה");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCandidates();
  }, []);

  async function handleCreateCandidate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    // Validate ID on the fly before submitting
    if (!validateIdField(formData.id_number)) {
      setIdTouched(true);
      setFormError("מספר תעודת זהות אינו תקין לפי ספרת ביקורת ישראלית");
      return;
    }

    setCreating(true);

    try {
      const res = await fetch("/api/vendor/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "שגיאה ביצירת המועמד");
      }

      // Reset form and close modal
      setFormData({
        full_name: "",
        id_number: "",
        project_id: "",
        email: "",
        phone: "",
      });
      setIsModalOpen(false);

      // Refresh list
      await loadCandidates();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "שגיאה ביצירת המועמד");
    } finally {
      setCreating(false);
    }
  }

  const filteredCandidates = candidates.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      c.full_name.toLowerCase().includes(q) ||
      c.id_number.toLowerCase().includes(q) ||
      c.project_id.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            רשימת מועמדים לקליטה
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            מעקב אחר סטטוס מסמכים, תיקיות Drive והתקדמות תהליך ה-Onboarding
          </p>
        </div>

        <button
          onClick={() => {
            setIdValidationError(null);
            setIdTouched(false);
            setFormError(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>הוספת מועמד חדש</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש לפי שם, תעודת זהות או פרויקט..."
            className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadCandidates}
            className="text-xs font-semibold underline hover:no-underline"
          >
            נסה שוב
          </button>
        </div>
      )}

      {/* Content State */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="text-sm text-slate-500 font-medium">
            טוען רשימת מועמדים...
          </span>
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
            <FileCheck2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">
            {searchQuery ? "לא נמצאו תוצאות לחיפוש" : "טרם נוספו מועמדים"}
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
            {searchQuery
              ? "נסה לשנות את מונחי החיפוש."
              : "התחל על ידי הוספת המועמד הראשון כדי לפתוח עבורו תיקיית מסמכים ב-Drive."}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>הוסף מועמד חדש</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-4 px-6">שם המועמד</th>
                  <th className="py-4 px-6">ת.ז.</th>
                  <th className="py-4 px-6">פרויקט</th>
                  <th className="py-4 px-6">שלב נוכחי</th>
                  <th className="py-4 px-6">השלמת מסמכים</th>
                  <th className="py-4 px-6 text-left">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredCandidates.map((candidate) => (
                  <tr
                    key={candidate.candidate_id}
                    className="hover:bg-slate-50/50 transition-colors"
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
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                        {candidate.project_id}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        {candidate.current_stage_id === "stage_initial"
                          ? "איסוף מסמכים"
                          : candidate.current_stage_id}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 max-w-[120px] bg-slate-100 rounded-full h-2 overflow-hidden">
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
                          {candidate.completionRatio}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-left">
                      <Link
                        href={`/vendor/candidate/${candidate.candidate_id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-xs transition"
                      >
                        <span>צק ליסט מסמכים</span>
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

      {/* "Add New Candidate" Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  הוספת מועמד חדש לקליטה
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateCandidate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  שם מלא של המועמד *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    placeholder="לדוגמה: ישראל ישראלי"
                    className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <CreditCard className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={formData.id_number}
                      onChange={(e) => handleIdChange(e.target.value)}
                      onBlur={handleIdBlur}
                      placeholder="9 ספרות (למשל: 038602207)"
                      className={`w-full pr-9 pl-3 py-2 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 transition ${
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    פרויקט מיועד *
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={formData.project_id}
                      onChange={(e) =>
                        setFormData({ ...formData, project_id: e.target.value })
                      }
                      placeholder="שם הפרויקט"
                      className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    אימייל מועמד *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      dir="ltr"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="candidate@email.com"
                      className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-left"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    טלפון נייד *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      dir="ltr"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="050-1234567"
                      className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-600 flex items-start gap-2">
                <FolderOpen className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>
                  בלחיצה על &quot;צור מועמד&quot; תיווצר תיקיית Drive ייעודית ויוגדרו 9
                  מסמכי חובה בסטטוס &apos;טרם הועלה&apos;.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={creating}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>יוצר מועמד ותיקייה...</span>
                    </>
                  ) : (
                    <span>צור מועמד</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
