"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Loader2,
  Trash2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { DEFAULT_UPLOAD_POLICY, type UploadPolicyConfig } from "@/lib/uploadPolicyTypes";

interface PassportPhotoUploadCardProps {
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

interface StagedPhoto {
  file: File;
  previewUrl: string;
}

export default function PassportPhotoUploadCard({
  candidate,
  token,
  onUploaded,
  onNavigateNext,
  nextDocTypeId,
}: PassportPhotoUploadCardProps) {
  const [policy, setPolicy] = useState<UploadPolicyConfig>(DEFAULT_UPLOAD_POLICY);
  const [stagedPhoto, setStagedPhoto] = useState<StagedPhoto | null>(null);
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

  const allowedExts = (
    policy.passport_photo?.allowed_extensions || [".jpg", ".jpeg", ".png", ".webp"]
  ).map((e) => e.toLowerCase());

  function getExtension(name: string) {
    const lastDot = name.lastIndexOf(".");
    return lastDot !== -1 ? name.slice(lastDot).toLowerCase() : "";
  }

  function handlePhotoSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const file = files[0];
    const ext = getExtension(file.name);

    // Strict validation: must be image MIME and match admin allowed extensions
    if (!file.type.startsWith("image/") || !allowedExts.includes(ext)) {
      setErrorMessage(
        `הקובץ "${file.name}" אינו תמונה מורשית! סיומות מאושרות ע"י המנהל לתמונת פספורט: ${allowedExts.join(", ")}`
      );
      return;
    }

    const maxBytes = (policy.passport_photo?.max_size_mb || 5) * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMessage(
        `גודל התמונה חורג מהמקסימום המותר (${policy.passport_photo?.max_size_mb || 5}MB)`
      );
      return;
    }

    if (stagedPhoto?.previewUrl) {
      URL.revokeObjectURL(stagedPhoto.previewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setStagedPhoto({ file, previewUrl });
  }

  function handleRemovePhoto() {
    if (stagedPhoto?.previewUrl) {
      URL.revokeObjectURL(stagedPhoto.previewUrl);
    }
    setStagedPhoto(null);
  }

  async function handleUpload() {
    if (!stagedPhoto) {
      setErrorMessage("נא לצלם או לבחור תמונת פספורט תחילה");
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", stagedPhoto.file);
      formData.append("candidate_id", candidate.candidate_id);
      formData.append("doc_type_id", "doc_11");

      if (token) {
        formData.append("token", token);
      }

      const ext = getExtension(stagedPhoto.file.name);
      const customName = `תמונת פספורט - ${candidate.full_name}${ext}`;
      formData.append("custom_file_name", customName);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        headers: token ? { "x-candidate-token": token } : undefined,
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "שגיאה בהעלאת תמונת הפספורט");
      }

      setSuccessMessage("תמונת הפספורט נבדקה, אושרה והועלתה בהצלחה ל-Google Drive!");
      handleRemovePhoto();

      if (onUploaded) {
        onUploaded("doc_11");
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "שגיאה בהעלאת תמונת הפספורט"
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
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">
                שלב 11 מתוך 11
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
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                צילום תמונת פספורט רשמית
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                תמונת פנים חזיתית וברורה על רקע בהיר ואחיד עבור הנפקת כרטיס חכם ותג עובד
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
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>הנחיות לתמונת פספורט:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-600">
            <li>
              <strong>סיומות תמונה מורשות ע"י מנהל המערכת:</strong>{" "}
              <span className="font-mono text-indigo-700 font-bold uppercase">
                {allowedExts.join(", ")}
              </span>{" "}
              (חובה לבחור קובץ תמונה בלבד).
            </li>
            <li>תמונת פנים ברורה, חזיתית, ללא כיסוי פנים או משקפי שמש כהים.</li>
            <li>גודל קובץ מרבי: עד {policy.passport_photo?.max_size_mb || 5}MB.</li>
          </ul>
        </div>

        {/* Action Buttons: Selfie Snap & File Select */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center justify-center gap-2.5 p-4 rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 font-bold text-sm transition hover:border-indigo-500 shadow-xs"
          >
            <Camera className="w-5 h-5 text-indigo-600" />
            <span>צלם תמונת פספורט במצלמה</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2.5 p-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-100 text-slate-700 font-bold text-sm transition hover:border-slate-400 shadow-xs"
          >
            <Upload className="w-5 h-5 text-slate-600" />
            <span>בחר תמונה מהמכשיר</span>
          </button>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={(e) => handlePhotoSelect(e.target.files)}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept={allowedExts.join(",")}
            onChange={(e) => handlePhotoSelect(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Staged Photo Preview */}
        {stagedPhoto && (
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              תצוגה מקדימה של תמונת הפספורט:
            </h4>

            <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-36 h-48 rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-md bg-white shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={stagedPhoto.previewUrl}
                  alt="תמונת פספורט"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border border-indigo-400/40 rounded-2xl pointer-events-none" />
              </div>

              <div className="space-y-2 text-right flex-1">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>קובץ תמונה תקין ובסיומת מורשית</span>
                </div>
                <p className="text-xs text-slate-600 font-mono">
                  שם הקובץ: {stagedPhoto.file.name}
                </p>
                <p className="text-xs text-slate-500">
                  גודל: {(stagedPhoto.file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-semibold pt-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>החלף תמונה</span>
                </button>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full inline-flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>מעלה ל-Google Drive...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>אשר ושמור תמונת פספורט ב-Drive</span>
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
