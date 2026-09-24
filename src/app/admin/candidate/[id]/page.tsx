"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  Folder,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  Building,
  User,
  Phone,
  Mail,
  Loader2,
  ShieldCheck,
  Clock,
} from "lucide-react";

interface CandidateInfo {
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
  created_at: string;
  updated_at: string;
}

interface VendorInfo {
  vendor_id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
}

interface StageItem {
  stage_id: string;
  stage_name: string;
  stage_order: number;
  is_terminal: boolean;
}

interface ChecklistItemDetail {
  doc_type_id: string;
  doc_name: string;
  is_required: boolean;
  template_drive_url: string | null;
  order_index: number;
  checklist_item_id: string;
  status: string;
  file_name: string | null;
  file_drive_id: string | null;
  file_drive_url: string | null;
  updated_at: string;
}

export default function AdminCandidateReviewPage() {
  const params = useParams();
  const router = useRouter();
  const candidateId = typeof params?.id === "string" ? params.id : "";

  const [candidate, setCandidate] = useState<CandidateInfo | null>(null);
  const [vendor, setVendor] = useState<VendorInfo | null>(null);
  const [stages, setStages] = useState<StageItem[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItemDetail[]>([]);
  const [stats, setStats] = useState({
    total: 9,
    uploaded: 0,
    documentsRatio: "0/9",
    completionPercentage: 0,
    canComplete: false,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stage change tracking
  const [updatingStage, setUpdatingStage] = useState(false);
  const [stageToast, setStageToast] = useState<string | null>(null);

  // Completion modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  async function loadCandidate() {
    if (!candidateId) return;
    try {
      setLoading(true);
      setError(null);

      let res = await fetch(`/api/admin/candidate/${candidateId}`);
      if (!res.ok && res.status === 404 && typeof window !== "undefined") {
        const local = localStorage.getItem("onboarding_demo_candidates");
        if (local) {
          try {
            const parsed = JSON.parse(local);
            const found = Array.isArray(parsed)
              ? parsed.find((c: any) => c.candidate_id === candidateId)
              : null;
            if (found) {
              await fetch("/api/demo/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ candidates: parsed }),
              });
              res = await fetch(`/api/admin/candidate/${candidateId}`);
            }
          } catch {}
        }
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "שגיאה בטעינת נתוני המועמד");
      }

      const data = await res.json();
      setCandidate(data.candidate);
      setVendor(data.vendor);
      setStages(data.stages || []);
      setChecklist(data.checklist || []);
      setStats(data.stats || stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינת הנתונים");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCandidate();
  }, [candidateId]);

  async function handleStageChange(newStageId: string) {
    if (!newStageId || !candidate || newStageId === candidate.current_stage_id) return;
    setUpdatingStage(true);
    setStageToast(null);

    try {
      const res = await fetch(`/api/admin/candidate/${candidateId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage_id: newStageId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "שגיאה בעדכון השלב");
      }

      setCandidate({ ...candidate, current_stage_id: newStageId });
      setStageToast(data.message || "השלב עודכן בהצלחה");
      setTimeout(() => setStageToast(null), 4000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "שגיאה בעדכון השלב");
    } finally {
      setUpdatingStage(false);
    }
  }

  async function handleCompleteCandidate() {
    setCompleting(true);
    setCompletionError(null);

    try {
      const res = await fetch(`/api/admin/candidate/${candidateId}/complete`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "שגיאה בסיום התהליך");
      }

      setIsConfirmModalOpen(false);
      router.push("/admin?completed=true");
      router.refresh();
    } catch (err) {
      setCompletionError(err instanceof Error ? err.message : "שגיאה בסיום התהליך");
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="text-sm font-medium text-slate-500">
          טוען נתוני מועמד לבדיקה...
        </span>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">שגיאה בטעינת המועמד</h2>
        <p className="text-sm text-slate-600 mb-6">{error || "המועמד לא נמצא"}</p>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
        >
          <ArrowRight className="w-4 h-4" />
          <span>חזרה ללוח המועמדים</span>
        </Link>
      </div>
    );
  }

  const allMandatoryFulfilled = stats.uploaded === stats.total;

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/admin" className="hover:text-blue-600 transition flex items-center gap-1">
          <ArrowRight className="w-4 h-4" />
          <span>חזרה למועמדים פעילים</span>
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">{candidate.full_name}</span>
      </div>

      {/* Candidate Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
              <User className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900">
                  {candidate.full_name}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-md font-mono bg-slate-100 text-slate-700">
                  ת.ז: {candidate.id_number}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-md font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  פרויקט: {candidate.project_id}
                </span>
                {candidate.is_completed && (
                  <span className="text-xs px-2.5 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    הונפק כרטיס חכם
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-500 mt-2 flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  ספק: <strong>{vendor?.company_name || candidate.vendor_id}</strong>
                </span>
                <span className="flex items-center gap-1" dir="ltr">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{candidate.email}</span>
                </span>
                <span className="flex items-center gap-1" dir="ltr">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{candidate.phone}</span>
                </span>
                {candidate.drive_folder_id && !candidate.drive_folder_id.startsWith("test_drive_folder_") ? (
                  <a
                    href={`https://drive.google.com/drive/folders/${candidate.drive_folder_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold"
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>תיקיית מועמד ב-Drive</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg text-[11px] font-medium" title="מצב הדגמה: סנכרון Google Drive אינו פעיל. ניתן לחבר חשבון דרייב בהגדרות מערכת.">
                    <Folder className="w-3 h-3 text-amber-600" />
                    <span>תיקיית מועמד מקומית (מצב הדגמה - ללא חיבור ל-Drive)</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stage Selector Box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 min-w-[280px]">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>שלב נוכחי בתהליך</span>
              {updatingStage && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />}
            </label>
            <select
              value={candidate.current_stage_id}
              onChange={(e) => handleStageChange(e.target.value)}
              disabled={updatingStage || candidate.is_completed}
              className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 disabled:opacity-60"
            >
              {stages.map((stage) => (
                <option key={stage.stage_id} value={stage.stage_id}>
                  {stage.stage_name}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-500 mt-1.5 block">
              שינוי השלב נשמר מיידית ב-Google Sheets ומתועד ב-Audit Log.
            </span>
          </div>
        </div>
      </div>

      {/* Stage Update Toast Message */}
      {stageToast && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{stageToast}</span>
          </div>
          <button
            onClick={() => setStageToast(null)}
            className="text-xs font-semibold underline hover:no-underline"
          >
            סגור
          </button>
        </div>
      )}

      {/* Checklist Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              צ&apos;ק-ליסט 9 מסמכי חובה
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              בדיקת שלמות המסמכים, זמני העלאה וצפייה ישירה בקובצי ה-PDF שהועלו
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
              הועלו {stats.uploaded} מתוך {stats.total}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <th className="py-3.5 px-6">#</th>
                <th className="py-3.5 px-6">שם המסמך</th>
                <th className="py-3.5 px-6">סטטוס</th>
                <th className="py-3.5 px-6">שם קובץ תקני ב-Drive</th>
                <th className="py-3.5 px-6">מועד העלאה</th>
                <th className="py-3.5 px-6 text-left">צפייה</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {checklist.map((item, idx) => {
                const isUploaded =
                  item.status === "Uploaded" ||
                  item.status === "uploaded" ||
                  item.status === "approved" ||
                  item.status === "Approved";

                return (
                  <tr key={item.doc_type_id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-6 font-mono text-xs text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="font-semibold text-slate-900">
                        {item.doc_name}
                      </div>
                      {item.is_required && (
                        <span className="text-[10px] text-rose-600 font-medium">
                          מסמך חובה
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          isUploaded
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {isUploaded ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>הועלה</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>טרם הועלה</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-xs font-mono text-slate-600 max-w-xs truncate">
                      {item.file_name || "לא הועלה קובץ"}
                    </td>
                    <td className="py-3.5 px-6 text-xs text-slate-500">
                      {isUploaded && item.updated_at
                        ? new Date(item.updated_at).toLocaleString("he-IL")
                        : "-"}
                    </td>
                    <td className="py-3.5 px-6 text-left">
                      {isUploaded && item.file_drive_url ? (
                        <a
                          href={item.file_drive_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-xs transition"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>צפייה ב-Drive</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Completion Action Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <span>סיום תהליך קליטה והנפקת כרטיס חכם</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {allMandatoryFulfilled
              ? "כל 9 מסמכי החובה הועלו ונבדקו. ניתן לאשר סופית את הנפקת הכרטיס החכם."
              : `חסרים עוד ${stats.total - stats.uploaded} מסמכי חובה להשלמת התהליך.`}
          </p>
        </div>

        {candidate.is_completed ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-xl border border-emerald-200">
            <CheckCircle2 className="w-4 h-4" />
            <span>התהליך הושלם</span>
          </div>
        ) : (
          <button
            onClick={() => setIsConfirmModalOpen(true)}
            disabled={!allMandatoryFulfilled}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>סיים תהליך והנפק כרטיס</span>
          </button>
        )}
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">
              אישור הנפקת כרטיס חכם
            </h3>

            <p className="text-sm text-slate-600 text-center mb-6">
              האם לאשר את השלמת תהליך הקליטה עבור המועמד{" "}
              <strong>{candidate.full_name}</strong> (ת.ז. {candidate.id_number})?
              פעולה זו תסמן את המועמד כמושלם ותעביר אותו לארכיון המאושרים.
            </p>

            {completionError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {completionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={completing}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleCompleteCandidate}
                disabled={completing}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center gap-2 disabled:opacity-50"
              >
                {completing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>מעדכן ומאשר...</span>
                  </>
                ) : (
                  <span>אשר והנפק כרטיס</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
