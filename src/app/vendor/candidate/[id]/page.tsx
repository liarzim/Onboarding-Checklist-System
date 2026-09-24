"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download,
  Loader2,
  Folder,
  User,
  ShieldAlert,
  PenTool,
  Camera,
  Image as ImageIcon,
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

export default function CandidateChecklistPage() {
  const params = useParams();
  const candidateId = typeof params?.id === "string" ? params.id : "";

  const [candidate, setCandidate] = useState<CandidateInfo | null>(null);
  const [items, setItems] = useState<ChecklistItemDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Uploading state tracking by doc_type_id
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<{
    type: "success" | "error";
    text: string;
    docId: string;
  } | null>(null);

  async function loadCandidateData() {
    if (!candidateId) return;
    try {
      setLoading(true);
      setError(null);
      let res = await fetch(`/api/vendor/candidates/${candidateId}`);
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
              res = await fetch(`/api/vendor/candidates/${candidateId}`);
            }
          } catch {}
        }
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "שגיאה בטעינת נתוני המועמד");
      }
      const data = await res.json();
      setCandidate(data.candidate);
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינת הנתונים");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCandidateData();
  }, [candidateId]);

  async function handleFileUpload(docTypeId: string, file: File) {
    if (!file) return;
    setUploadMessage(null);

    // Client-side validation per document type
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();

    if (docTypeId === "doc_11") {
      // Passport photo must be an image
      const allowedImageExts = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".bmp"];
      if (!allowedImageExts.includes(ext) || !file.type.startsWith("image/")) {
        setUploadMessage({
          type: "error",
          text: `שגיאה: לתמונת פספורט מורשים רק קובצי תמונה (${allowedImageExts.join(", ")}).`,
          docId: docTypeId,
        });
        return;
      }
    } else if (docTypeId === "doc_10") {
      // ID card allows images or PDF
      const allowedIdExts = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
      if (!allowedIdExts.includes(ext) && file.type !== "application/pdf" && !file.type.startsWith("image/")) {
        setUploadMessage({
          type: "error",
          text: `שגיאה: לצילום תעודת זהות מורשים רק קובצי תמונה או PDF (${allowedIdExts.join(", ")}).`,
          docId: docTypeId,
        });
        return;
      }
    } else {
      if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
        setUploadMessage({
          type: "error",
          text: "שגיאה: רק קבצי PDF מורשים להעלאה עבור טופס זה.",
          docId: docTypeId,
        });
        return;
      }
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadMessage({
        type: "error",
        text: "שגיאה: גודל הקובץ חורג מ-10MB המותרים.",
        docId: docTypeId,
      });
      return;
    }

    setUploadingDocId(docTypeId);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("candidate_id", candidateId);
    formData.append("doc_type_id", docTypeId);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "שגיאה בהעלאת הקובץ");
      }

      setUploadMessage({
        type: "success",
        text: `הקובץ הועלה בהצלחה בשם: ${result.document.file_name}`,
        docId: docTypeId,
      });

      // Update item in local state
      setItems((prev) =>
        prev.map((item) =>
          item.doc_type_id === docTypeId
            ? {
                ...item,
                status: "Uploaded",
                file_name: result.document.file_name,
                file_drive_id: result.document.file_drive_id,
                file_drive_url: result.document.file_drive_url,
                updated_at: result.document.updated_at,
              }
            : item
        )
      );
    } catch (err) {
      setUploadMessage({
        type: "error",
        text: err instanceof Error ? err.message : "שגיאה בהעלאת הקובץ ל-Drive",
        docId: docTypeId,
      });
    } finally {
      setUploadingDocId(null);
    }
  }

  const uploadedCount = items.filter(
    (i) =>
      i.status === "Uploaded" ||
      i.status === "uploaded" ||
      i.status === "approved" ||
      i.status === "Approved"
  ).length;

  const totalCount = items.length || 9;
  const progressPercent = Math.round((uploadedCount / totalCount) * 100);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="text-sm font-medium text-slate-500">
          טוען נתוני צק ליסט מועמד...
        </span>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">גישה נדחתה או שגיאה</h2>
        <p className="text-sm text-slate-600 mb-6">{error || "מועמד לא נמצא"}</p>
        <Link
          href="/vendor"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
        >
          <ArrowRight className="w-4 h-4" />
          <span>חזרה לרשימת המועמדים</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/vendor" className="hover:text-blue-600 transition flex items-center gap-1">
          <ArrowRight className="w-4 h-4" />
          <span>חזרה למועמדים</span>
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">{candidate.full_name}</span>
      </div>

      {/* Candidate Profile Summary Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
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
              </div>
              <div className="text-xs text-slate-500 mt-2 flex items-center gap-4 flex-wrap">
                <span>אימייל: {candidate.email}</span>
                <span>טלפון: {candidate.phone}</span>
                {candidate.drive_folder_id && !candidate.drive_folder_id.startsWith("test_drive_folder_") ? (
                  <a
                    href={`https://drive.google.com/drive/folders/${candidate.drive_folder_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>פתיחת תיקייה ב-Google Drive</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg text-[11px] font-medium" title="מצב הדגמה: סנכרון Google Drive אינו פעיל">
                    <Folder className="w-3 h-3 text-amber-600" />
                    <span>תיקיית מועמד מקומית (מצב הדגמה)</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 min-w-[240px]">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
              <span>התקדמות איסוף מסמכים</span>
              <span className="font-mono">{uploadedCount}/{totalCount} ({progressPercent}%)</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  uploadedCount === totalCount ? "bg-emerald-500" : "bg-blue-600"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {uploadedCount === totalCount
                ? `כל ${totalCount} מסמכי ושלבי החובה הושלמו בהצלחה!`
                : `נותרו ${totalCount - uploadedCount} מסמכים להעלאה`}
            </p>
          </div>
        </div>
      </div>

      {/* Global Upload Notification Toast */}
      {uploadMessage && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between border ${
            uploadMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {uploadMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{uploadMessage.text}</span>
          </div>
          <button
            onClick={() => setUploadMessage(null)}
            className="text-xs font-semibold underline hover:no-underline"
          >
            סגור
          </button>
        </div>
      )}

      {/* Documents & Media Checklist */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {totalCount} מסמכי חובה ושלבי קליטה
          </h2>
          <span className="text-xs text-slate-500">
            שמירה מאובטחת ומסודרת ב-Google Drive
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {items.map((item, index) => (
            <DocumentRow
              key={item.doc_type_id}
              candidateId={candidateId}
              item={item}
              index={index + 1}
              isUploading={uploadingDocId === item.doc_type_id}
              onUpload={(file) => handleFileUpload(item.doc_type_id, file)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface DocumentRowProps {
  candidateId: string;
  item: ChecklistItemDetail;
  index: number;
  isUploading: boolean;
  onUpload: (file: File) => void;
}

function DocumentRow({ candidateId, item, index, isUploading, onUpload }: DocumentRowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const isUploaded =
    item.status === "Uploaded" ||
    item.status === "uploaded" ||
    item.status === "approved" ||
    item.status === "Approved";

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files[0]);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files[0]);
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`bg-white rounded-2xl border transition-all p-5 shadow-sm ${
        isDragOver
          ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20"
          : isUploaded
          ? "border-slate-200"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Document Info */}
        <div className="flex items-start gap-4 flex-1">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${
              isUploaded
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {isUploaded ? <CheckCircle2 className="w-5 h-5" /> : index}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-base">
                {item.doc_name}
              </h3>
              {item.is_required && (
                <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-rose-50 text-rose-700 border border-rose-200">
                  חובה
                </span>
              )}
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                  isUploaded
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {isUploaded ? "הועלה בהצלחה" : "טרם הועלה"}
              </span>
            </div>

            {/* Template Download Link */}
            <div className="flex items-center gap-3 text-xs pt-0.5">
              <a
                href={
                  item.template_drive_url ||
                  `#template-${item.doc_type_id}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-600 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>הורדת טופס ריק למילוי</span>
              </a>

              {isUploaded && item.file_drive_url && (
                <a
                  href={item.file_drive_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>צפייה בקובץ ב-Drive</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Uploaded File Details */}
            {isUploaded && item.file_name && (
              <div className="text-xs text-slate-500 pt-1 font-mono break-all">
                קובץ: {item.file_name}
              </div>
            )}
          </div>
        </div>

        {/* Dual Actions: Fill Online Form / Upload Media or Upload File */}
        <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
          {/* Digital Interactive Form or Camera Upload Link */}
          <Link
            href={`/vendor/candidate/${candidateId}/form/${item.doc_type_id}`}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl transition shadow-xs ${
              isUploaded
                ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
            }`}
          >
            {item.doc_type_id === "doc_10" || item.doc_type_id === "doc_11" ? (
              <Camera className="w-3.5 h-3.5" />
            ) : (
              <PenTool className="w-3.5 h-3.5" />
            )}
            <span>
              {item.doc_type_id === "doc_11"
                ? (isUploaded ? "החלף תמונת פספורט" : "צלם / העלה תמונת פספורט")
                : item.doc_type_id === "doc_10"
                ? (isUploaded ? "החלף צילום ת.ז." : "צלם / העלה תעודת זהות")
                : (isUploaded ? "מלא מחדש דיגיטלית" : "מלא טופס דיגיטלי")}
            </span>
          </Link>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={
              item.doc_type_id === "doc_11"
                ? "image/*"
                : item.doc_type_id === "doc_10"
                ? "image/*,.pdf,application/pdf"
                : ".pdf,application/pdf"
            }
            className="hidden"
          />

          {/* Quick File Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition disabled:opacity-50"
            title="העלאת קובץ מהמכשיר"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>מעלה ל-Drive...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {item.doc_type_id === "doc_11"
                    ? (isUploaded ? "החלף תמונה" : "העלה תמונה")
                    : item.doc_type_id === "doc_10"
                    ? (isUploaded ? "החלף קובץ" : "העלה קובץ")
                    : (isUploaded ? "החלף קובץ סרוק" : "העלה קובץ סרוק")}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
