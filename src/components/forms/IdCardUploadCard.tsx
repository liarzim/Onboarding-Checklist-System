"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Loader2,
  Trash2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { DEFAULT_UPLOAD_POLICY, type UploadPolicyConfig } from "@/lib/uploadPolicyTypes";

interface IdCardUploadCardProps {
  candidate: {
    candidate_id: string;
    full_name: string;
    id_number: string;
    vendor_company_name?: string;
  };
  token?: string; // Present if candidate portal
  onUploaded?: (docTypeId: string) => void;
  onNavigateNext?: () => void;
  nextDocTypeId?: string | null;
}

interface StagedFile {
  file: File;
  previewUrl: string;
  isImage: boolean;
}

export default function IdCardUploadCard({
  candidate,
  token,
  onUploaded,
  onNavigateNext,
  nextDocTypeId,
}: IdCardUploadCardProps) {
  const [policy, setPolicy] = useState<UploadPolicyConfig>(DEFAULT_UPLOAD_POLICY);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadPolicy() {
      try {
        const res = await fetch("/api/admin/settings/upload-policy");
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          setPolicy(json.data);
        }
      } catch {
        // Fallback to default
      }
    }
    loadPolicy();
  }, []);

  const allowedExts = (policy.id_card?.allowed_extensions || [".jpg", ".jpeg", ".png", ".webp", ".pdf"]).map(
    (e) => e.toLowerCase()
  );

  function getExtension(name: string) {
    const lastDot = name.lastIndexOf(".");
    return lastDot !== -1 ? name.slice(lastDot).toLowerCase() : "";
  }

  function handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const newStaged: StagedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = getExtension(file.name);

      if (!allowedExts.includes(ext)) {
        setErrorMessage(
          `הקובץ "${file.name}" בעל סיומת שאינה מורשית. סיומות מאושרות לתעודת זהות: ${allowedExts.join(", ")}`
        );
        return;
      }

      const maxBytes = (policy.id_card?.max_size_mb || 10) * 1024 * 1024;
      if (file.size > maxBytes) {
        setErrorMessage(
          `הקובץ "${file.name}" חורג מהגודל המרבי (${policy.id_card?.max_size_mb || 10}MB)`
        );
        return;
      }

      const isImg = file.type.startsWith("image/");
      const previewUrl = isImg ? URL.createObjectURL(file) : "";
      newStaged.push({ file, previewUrl, isImage: isImg });
    }

    const maxFiles = policy.id_card?.max_files || 5;
    setStagedFiles((prev) => [...prev, ...newStaged].slice(0, maxFiles));
  }

  function removeStagedFile(index: number) {
    setStagedFiles((prev) => {
      const target = prev[index];
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleUpload() {
    if (stagedFiles.length === 0) {
      setErrorMessage("נא לבחור או לצלם קובץ תעודת זהות תחילה");
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      for (let i = 0; i < stagedFiles.length; i++) {
        const item = stagedFiles[i];
        const formData = new FormData();
        formData.append("file", item.file);
        formData.append("candidate_id", candidate.candidate_id);
        formData.append("doc_type_id", "doc_10");

        if (token) {
          formData.append("token", token);
        }

        const ext = getExtension(item.file.name);
        const suffix = stagedFiles.length > 1 ? `_חלק_${i + 1}` : "";
        const cleanId = candidate.id_number ? ` - ${candidate.id_number}` : "";
        const customName = `צילום תעודת זהות${suffix} - ${candidate.full_name}${cleanId}${ext}`;
        formData.append("custom_file_name", customName);

        const res = await fetch("/api/documents/upload", {
          method: "POST",
          headers: token ? { "x-candidate-token": token } : undefined,
          body: formData,
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || `שגיאה בהעלאת ${item.file.name}`);
        }
      }

      setSuccessMessage(
        stagedFiles.length === 1
          ? "קובץ תעודת הזהות הועלה ונשמר בהצלחה ב-Google Drive!"
          : `כל ${stagedFiles.length} קובצי תעודת הזהות והספח הועלו בהצלחה ל-Google Drive!`
      );

      stagedFiles.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
      setStagedFiles([]);

      if (onUploaded) {
        onUploaded("doc_10");
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "שגיאה בהעלאת קבצי תעודת הזהות"
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6" dir="rtl">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm space-y-6">
        {/* Header */}
        <div className="border-b border-slate-100 pb-5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">
                שלב 10 מתוך 11
              </span>
              {!token && (
                <Link
                  href={`/vendor/candidate/${candidate.candidate_id}`}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition mr-2"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>חזרה לצ'קליסט מועמד</span>
                </Link>
              )}
            </div>
            <span className="text-xs text-slate-500">
              מועמד/ת: <strong className="text-slate-800">{candidate.full_name}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                צילום תעודת זהות וספח
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                צילום ברור של תעודת הזהות (צד קדמי, צד אחורי וספח כתובת מעודכן). ניתן להעלות מספר קבצים או תמונות.
              </p>
            </div>
          </div>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
              <span className="font-bold">{successMessage}</span>
            </div>
            <div className="flex items-center gap-2">
              {!token && (
                <Link
                  href={`/vendor/candidate/${candidate.candidate_id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs shrink-0"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>חזרה לצ'קליסט</span>
                </Link>
              )}
              {onNavigateNext && nextDocTypeId && (
                <button
                  type="button"
                  onClick={onNavigateNext}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs shrink-0"
                >
                  <span>המשך לשלב הבא</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>הנחיות להעלאת תעודת זהות:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-600">
            <li>
              <strong>ניתן להעלות מספר קבצים או תמונות:</strong> צד קדמי, צד אחורי וספח כתובת (עד {policy.id_card?.max_files || 5} קבצים).
            </li>
            <li>
              <strong>סיומות מורשות:</strong>{" "}
              <span className="font-mono text-blue-700 font-bold uppercase">
                {allowedExts.join(", ")}
              </span>{" "}
              (קובצי תמונה או מסמכי PDF).
            </li>
            <li>ודא שמספר תעודת הזהות ({candidate.id_number}) והפרטים האישיים קריאים וברורים.</li>
          </ul>
        </div>

        {/* Action Buttons: Camera Snap & File Select */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center justify-center gap-2.5 p-4 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 text-blue-700 font-bold text-sm transition hover:border-blue-500 shadow-xs"
          >
            <Camera className="w-5 h-5 text-blue-600" />
            <span>צלם תעודת זהות במצלמה</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2.5 p-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-100 text-slate-700 font-bold text-sm transition hover:border-slate-400 shadow-xs"
          >
            <Upload className="w-5 h-5 text-slate-600" />
            <span>בחר קבצים מהמכשיר</span>
          </button>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*,.pdf"
            capture="environment"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept={allowedExts.join(",")}
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Staged Files Preview */}
        {stagedFiles.length > 0 && (
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              קבצים שנבחרו להעלאה ({stagedFiles.length}):
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stagedFiles.map((staged, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {staged.isImage ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-slate-200 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={staged.previewUrl}
                          alt={`תעודת זהות ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                        <FileText className="w-6 h-6" />
                      </div>
                    )}
                    <div className="min-w-0 text-right">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {staged.file.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {(staged.file.size / 1024).toFixed(1)} KB (קובץ {idx + 1})
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeStagedFile(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="הסר קובץ זה"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full inline-flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>מעלה ל-Google Drive...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>אשר והעלה {stagedFiles.length} קובצי תעודת זהות ל-Drive</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
