"use client";

import React, { useState } from "react";
import {
  X,
  FileCheck,
  Shield,
  Eye,
  Calendar,
  Building,
  User,
  CreditCard,
  Briefcase,
} from "lucide-react";
import { getFullDocumentInfo } from "@/lib/forms/declarationsFullText";
import { FORM_METADATA_LIST } from "@/lib/forms/formDefinitions";
import SignaturePad from "./SignaturePad";

interface FormPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  docTypeId: string;
}

export default function FormPreviewModal({
  isOpen,
  onClose,
  docTypeId,
}: FormPreviewModalProps) {
  const [sampleSig, setSampleSig] = useState<string | null>(null);

  if (!isOpen || !docTypeId) return null;

  const docInfo = getFullDocumentInfo(docTypeId);
  const meta = FORM_METADATA_LIST[docTypeId] || {
    docTypeId,
    title: docInfo.name,
    subtitle: docInfo.shortDesc,
    category: "security",
    version: "1.0",
  };

  const todayStr = new Date().toLocaleDateString("he-IL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  תצוגה מקדימה לתבנית דיגיטלית: {docInfo.name}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono border border-blue-500/30">
                  גרסה {docInfo.version || meta.version || "1.0"}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">מזהה טופס: {docTypeId}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body - Render Document Preview */}
        <div className="p-6 sm:p-10 space-y-6 overflow-y-auto bg-slate-100 flex-1">
          {/* Document Sheet Container (Simulating Print Canvas) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-sm space-y-8 text-slate-900 max-w-3xl mx-auto">
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold uppercase tracking-wider text-slate-700">
                  מערכת קליטה ואבטחת מידע - תבנית רשמית
                </span>
                <span>תאריך מילוי: {todayStr}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900">{docInfo.name}</h1>
                  <p className="text-xs text-slate-600 font-medium">{docInfo.shortDesc}</p>
                  {docInfo.lawReference && (
                    <p className="text-[11px] text-blue-700 font-medium mt-0.5">
                      בסיס חוקי: {docInfo.lawReference}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Simulated Candidate Metadata Header Box */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                פרטי מועמד/ת (הדמיה לתצוגה מקדימה)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 block">שם מלא:</span>
                  <span className="font-bold text-slate-800">ישראל ישראלי</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">תעודת זהות:</span>
                  <span className="font-mono font-bold text-slate-800">012345678</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">פרויקט יעד:</span>
                  <span className="font-semibold text-slate-800">פרויקט סייבר ותשתיות</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">חברת ספק:</span>
                  <span className="font-semibold text-slate-800">טכנולוגיות מתקדמות בע"מ</span>
                </div>
              </div>
            </div>

            {/* Document Clauses Text */}
            <div className="space-y-4 text-sm leading-relaxed border border-slate-200 rounded-xl p-6 bg-slate-50/40">
              <h3 className="font-bold text-slate-900 text-sm border-b pb-2">
                סעיפי ההצהרה והתנאים המשפטיים
              </h3>
              <div className="space-y-3 text-slate-700 text-xs sm:text-sm">
                {docInfo.fullContent.map((clause, idx) => (
                  <p key={idx} className="leading-relaxed">
                    {clause}
                  </p>
                ))}
              </div>
            </div>

            {/* Signature Area Preview */}
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div className="text-xs text-slate-600 font-medium">
                הנני מאשר/ת בחתימתי כי קראתי בעיון את כל סעיפי המסמך, הבנתי את תוכנו ומשמעותו המשפטית, והפרטים שנמסרו על ידי נכונים ומלאים.
              </div>
              <SignaturePad
                onSignatureChange={setSampleSig}
                signerName="ישראל ישראלי"
              />
            </div>

            {/* Document Footer */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
              <span>מזהה תבנית: {docTypeId}</span>
              <span>גרסת נוסח: {docInfo.version || "1.0"}</span>
              <span>מסמך דיגיטלי מאובטח (E-Sign)</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
          >
            סגור תצוגה מקדימה
          </button>
        </div>
      </div>
    </div>
  );
}
