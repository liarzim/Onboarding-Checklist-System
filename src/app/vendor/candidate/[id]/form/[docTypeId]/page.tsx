"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, ArrowRight } from "lucide-react";
import DigitalFormView from "@/components/forms/DigitalFormView";

export default function CandidateDigitalFormPage() {
  const params = useParams();
  const router = useRouter();

  const candidateId = typeof params?.id === "string" ? params.id : "";
  const docTypeId = typeof params?.docTypeId === "string" ? params.docTypeId : "";

  const [candidate, setCandidate] = useState<any | null>(null);
  const [initialFormData, setInitialFormData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!candidateId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/vendor/candidates/${candidateId}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || "שגיאה בטעינת נתוני המועמד");
        }
        const data = await res.json();
        setCandidate(data.candidate);

        // Extract and aggregate previous form answers across all candidate checklist items
        if (data.items && Array.isArray(data.items)) {
          let mergedAnswers: any = {};
          data.items.forEach((it: any) => {
            if (it.form_data) {
              try {
                const parsed = JSON.parse(it.form_data);
                mergedAnswers = { ...mergedAnswers, ...parsed };
              } catch {
                // Ignore
              }
            }
          });

          // Overlay specific doc answers with highest priority
          const currentDoc = data.items.find((i: any) => i.doc_type_id === docTypeId);
          if (currentDoc?.form_data) {
            try {
              const currentParsed = JSON.parse(currentDoc.form_data);
              mergedAnswers = { ...mergedAnswers, ...currentParsed };
            } catch {
              // Ignore
            }
          }

          if (data.candidate?.signature_url && !mergedAnswers.signatureDataUrl) {
            mergedAnswers.signatureDataUrl = data.candidate.signature_url;
          }

          if (Object.keys(mergedAnswers).length > 0) {
            setInitialFormData(mergedAnswers);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "שגיאה בטעינת הנתונים");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [candidateId, docTypeId]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm font-medium text-slate-600">
          טוען את הטופס הדיגיטלי...
        </span>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
        <h2 className="text-lg font-bold text-rose-900">שגיאה בטעינת הטופס</h2>
        <p className="text-sm text-rose-700">{error || "מועמד לא נמצא"}</p>
        <Link
          href={`/vendor/candidate/${candidateId}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-rose-200 text-xs font-semibold text-rose-800 hover:bg-rose-100 transition"
        >
          <ArrowRight className="w-4 h-4" />
          <span>חזרה לצ'קליסט</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <DigitalFormView
        docTypeId={docTypeId}
        candidate={candidate}
        initialFormData={initialFormData}
      />
    </div>
  );
}
