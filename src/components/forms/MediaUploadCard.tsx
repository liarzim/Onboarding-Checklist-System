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
  Image as ImageIcon,
  Loader2,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { DEFAULT_UPLOAD_POLICY, type UploadPolicyConfig } from "@/lib/uploadPolicyTypes";

interface MediaUploadCardProps {
  docTypeId: "doc_10" | "doc_11";
  candidate: {
    candidate_id: string;
    full_name: string;
    id_number: string;
    vendor_company_name?: string;
  };
  token?: string; // If candidate portal
  initialUploadedFiles?: Array<{
    name: string;
    url?: string | null;
  }>;
  onUploaded?: (docTypeId: string) => void;
  onNavigateNext?: () => void;
  nextDocTypeId?: string | null;
}

interface StagedFile {
  file: File;
  previewUrl: string;
  isImage: boolean;
}

export default function MediaUploadCard({
  docTypeId,
  candidate,
  token,
  initialUploadedFiles = [],
  onUploaded,
  onNavigateNext,
  nextDocTypeId,
}: MediaUploadCardProps) {
  const isPassport = docTypeId === "doc_11";
  const [policy, setPolicy] = useState<UploadPolicyConfig>(DEFAULT_UPLOAD_POLICY);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [uploadedList, setUploadedList] = useState(initialUploadedFiles);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Fetch live admin policy
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

  const allowedPassportExts = policy.passport_photo.allowed_extensions.map((e) =>
    e.toLowerCase()
  );
  const allowedIdCardExts = policy.id_card.allowed_extensions.map((e) =>
    e.toLowerCase()
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

      if (isPassport) {
        // Strict Image Validation against Admin Policy
        if (!allowedPassportExts.includes(ext) || !file.type.startsWith("image/")) {
          setErrorMessage(
            `הקובץ "${file.name}" אינו תמונה מורשית! סיומות מאושרות ע"י המנהל לתמונת פספורט: ${allowedPassportExts.join(
              ", "
            )}`
          );
          return;
        }

        if (file.size > policy.passport_photo.max_size_mb * 1024 * 1024) {
          setErrorMessage(
            `גודל התמונה חורג מהמקסימום המותר (${policy.passport_photo.max_size_mb}MB)`
          );
          return;
        }

        // Passport photo is single file
        const previewUrl = URL.createObjectURL(file);
        setStagedFiles([{ file, previewUrl, isImage: true }]);
        return;
      } else {
        // ID Card Validation (Images or PDF)
        if (!allowedIdCardExts.includes(ext)) {
          setErrorMessage(
            `הקובץ "${file.name}" בעל סיומת שאינה מורשית. סיומות מאושרות: ${allowedIdCardExts.join(
              ", "
            )}`
          );
          return;
        }

        if (file.size > policy.id_card.max_size_mb * 1024 * 1024) {
          setErrorMessage(
            `הקובץ "${file.name}" גדול מדי (מקסימום ${policy.id_card.max_size_mb}MB)`
          );
          return;
        }

        const isImg = file.type.startsWith("image/");
        const previewUrl = isImg ? URL.createObjectURL(file) : "";
        newStaged.push({ file, previewUrl, isImage: isImg });
      }
    }

    if (isPassport) {
      setStagedFiles(newStaged.slice(0, 1));
    } else {
      setStagedFiles((prev) => [...prev, ...newStaged].slice(0, policy.id_card.max_files));
    }
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
      setErrorMessage("נא לבחור או לצלם קובץ תחילה");
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
        formData.append("doc_type_id", docTypeId);

        if (token) {
          formData.append("token", token);
        }

        // Custom friendly name
        const ext = getExtension(item.file.name);
        let customName = "";
        if (isPassport) {
          customName = `תמונת פספורט - ${candidate.full_name}${ext}`;
        } else {
          const suffix = stagedFiles.length > 1 ? `_חלק_${i + 1}` : "";
          customName = `צילום תעודת זהות${suffix} - ${candidate.full_name}${ext}`;
        }
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
        isPassport
          ? "תמונת הפספורט נבדקה, אושרה והועלתה בהצלחה ל-Google Drive!"
          : `כל ${stagedFiles.length} קובצי תעודת הזהות הועלו בהצלחה ל-Google Drive!`
      );

      // Clean staged
      stagedFiles.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
      setStagedFiles([]);

      if (onUploaded) {
        onUploaded(docTypeId);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "שגיאה בהעלאת הקבצים למערכת"
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6" dir="rtl">
      {/* Main Container Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm space-y-6">
        {/* Header */}
        <div className="border-b border-slate-100 pb-5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">
                {isPassport ? "מסמך חובה 11 מתוך 11" : "מסמך חובה 10 מתוך 11"}
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
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              {isPassport ? <ImageIcon className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                {isPassport ? "צילום או הוספת תמונת פספורט" : "צילום או הוספת קובץ תעודת זהות"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {isPassport
                  ? "תמונת פנים ברורה על רקע בהיר להנפקת כרטיס חכם ותג עובד"
                  : "צילום תעודת זהות כולל ספח כתובת מעודכן (ניתן להעלות מספר קבצים/תמונות)"}
              </p>
            </div>
          </div>
        </div>

        {/* Feedback Banners */}
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
                  <ArrowRight className="w-3.5 h-3.5" />
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

        {/* Policy / Requirements Info Box */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>הנחיות ותנאי קבלה רשמיים:</span>
          </div>
          {isPassport ? (
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>
                <strong>סיומות מורשות ע"י מנהל המערכת:</strong>{" "}
                <span className="font-mono text-blue-700 font-bold uppercase">
                  {allowedPassportExts.join(", ")}
                </span>
                {" "}(חובה לבחור קובץ תמונה בלבד).
              </li>
              <li>תמונת פנים חזיתית וברורה, ללא כיסוי פנים או משקפי שמש כהים.</li>
              <li>גודל קובץ מרבי: עד {policy.passport_photo.max_size_mb}MB.</li>
            </ul>
          ) : (
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>
                <strong>ניתן להעלות מספר קבצים/תמונות:</strong> צד קדמי, צד אחורי, וספח כתובת בנפרד (עד {policy.id_card.max_files} קבצים).
              </li>
              <li>
                <strong>פורמטים מורשים:</strong>{" "}
                <span className="font-mono text-blue-700 font-bold uppercase">
                  {allowedIdCardExts.join(", ")}
                </span>{" "}
                (תמונות או קובצי PDF).
              </li>
              <li>יש לוודא שמספר תעודת הזהות ({candidate.id_number}) והתמונה קריאים לחלוטין.</li>
            </ul>
          )}
        </div>

        {/* Action Buttons: Camera Snap & File Pick */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Camera Capture */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center justify-center gap-2.5 p-4 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 text-blue-700 font-bold text-sm transition hover:border-blue-500 shadow-xs"
          >
            <Camera className="w-5 h-5 text-blue-600" />
            <span>{isPassport ? "צלם תמונת פספורט במצלמה" : "צלם תעודת זהות במצלמה"}</span>
          </button>

          {/* Device File Pick */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2.5 p-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-100 text-slate-700 font-bold text-sm transition hover:border-slate-400 shadow-xs"
          >
            <Upload className="w-5 h-5 text-slate-600" />
            <span>{isPassport ? "בחר תמונה מהמכשיר" : "בחר קבצים מהמכשיר"}</span>
          </button>

          {/* Hidden Inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept={isPassport ? "image/*" : "image/*,.pdf"}
            capture={isPassport ? "user" : "environment"}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept={isPassport ? allowedPassportExts.join(",") : allowedIdCardExts.join(",")}
            multiple={!isPassport}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Staged Files Preview Area */}
        {stagedFiles.length > 0 && (
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {isPassport ? "תצוגה מקדימה של התמונה שנבחרה:" : `קבצים שנבחרו להעלאה (${stagedFiles.length}):`}
            </h4>

            {isPassport ? (
              /* Passport Specific Preview Card */
              <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col sm:flex-row items-center gap-6">
                <div className="relative w-36 h-48 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-md bg-white shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={stagedFiles[0].previewUrl}
                    alt="Passport Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 border border-blue-400/40 rounded-2xl pointer-events-none" />
                </div>
                <div className="space-y-2 text-right flex-1">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>הקובץ תקין ובסיומת תמונה מורשית</span>
                  </div>
                  <p className="text-xs text-slate-600 font-mono">
                    שם הקובץ: {stagedFiles[0].file.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    גודל: {(stagedFiles[0].file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={() => removeStagedFile(0)}
                    className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-semibold pt-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>החלף תמונה</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Multiple Files Grid for ID Card */
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
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                          <FileText className="w-6 h-6" />
                        </div>
                      )}
                      <div className="min-w-0 text-right">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {staged.file.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {(staged.file.size / 1024).toFixed(1)} KB • קובץ {idx + 1}
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
            )}

            {/* Upload Button */}
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
                    <span>מעלה ושומר ב-Google Drive...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>
                      {isPassport
                        ? "אשר ושמור תמונת פספורט ב-Drive"
                        : `אשר והעלה ${stagedFiles.length} קובצי ת.ז. ל-Drive`}
                    </span>
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
