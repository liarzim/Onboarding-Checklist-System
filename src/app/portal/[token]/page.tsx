import { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, Clock, CheckCircle2, Shield } from "lucide-react";
import { sheetsRepository } from "@/lib/repositories/sheetsRepository";
import CandidatePortalClient from "@/components/portal/CandidatePortalClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "פורטל קליטת מועמד | Onboarding Checklist System",
  description: "מילוי, אימות וחתימה אלקטרונית על 11 שלבי קליטה, טפסים ומסמכים מזהים",
};

interface PortalPageProps {
  params: {
    token: string;
  };
}

export default async function CandidatePortalPage({ params }: PortalPageProps) {
  const token = params?.token || "";

  // 1. Fetch candidate by token from Google Sheets
  const candidate = await sheetsRepository.getCandidateByToken(token);

  // Guard Condition 1: Candidate / Token not found
  if (!candidate) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-3xl p-8 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-rose-500/20">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-slate-900">
            הקישור אינו תקין
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            לא נמצא מועמד המשויך לקישור זה. אנא וודא כי העתקת את הקישור במלואו, או פנה למשאבי אנוש או לספק לקבלת קישור עדכני.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-md transition"
            >
              לדף הבית של המערכת
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Guard Condition 2: Token expired
  if (candidate.token_expires_at) {
    const expirationDate = new Date(candidate.token_expires_at).getTime();
    if (!isNaN(expirationDate) && expirationDate < Date.now()) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
          <div className="max-w-md w-full bg-white border border-amber-200 rounded-3xl p-8 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-amber-500/20">
              <Clock className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-black text-slate-900">
              תוקף הקישור פג
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              שלום {candidate.full_name}, תוקף הקישור האישי למילוי טפסי הקליטה פג מטעמי אבטחת מידע.
              אנא פנה למנהל הגיוס או לספק לקבלת קישור חדש.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-md transition"
              >
                לדף הבית של המערכת
              </Link>
            </div>
          </div>
        </div>
      );
    }
  }

  // Guard Condition 3: Already submitted / signed
  if (candidate.is_signed_by_candidate) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-white border border-emerald-200 rounded-3xl p-8 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-slate-900">
            טפסי הקליטה כבר נחתמו ונשלחו
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            שלום {candidate.full_name}, טפסי הקליטה שלך כבר נחתמו ונשלחו בהצלחה למערכת.
            פנייתך נמצאת כעת בטיפול צוות משאבי אנוש וביטחון שדה. אין צורך במילוי נוסף.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-md transition"
            >
              לדף הבית של המערכת
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Resolve Vendor Company Name
  let vendorCompanyName = candidate.vendor_id;
  try {
    const vendorRecord = await sheetsRepository.getVendorById(candidate.vendor_id);
    if (vendorRecord && vendorRecord.company_name) {
      vendorCompanyName = vendorRecord.company_name;
    }
  } catch (err) {
    console.error("Error resolving vendor name:", err);
  }

  let checklistItems: any[] = [];
  try {
    checklistItems = await sheetsRepository.getChecklist(candidate.candidate_id);
  } catch (err) {
    console.error("Error fetching checklist items:", err);
  }

  const candidatePayload = {
    candidate_id: candidate.candidate_id,
    full_name: candidate.full_name,
    id_number: candidate.id_number,
    email: candidate.email,
    phone: candidate.phone,
    vendor_id: candidate.vendor_id,
    project_id: candidate.project_id,
    drive_folder_id: candidate.drive_folder_id,
    vendor_company_name: vendorCompanyName,
  };

  return (
    <main className="min-h-screen bg-slate-50/50 py-6 px-4 sm:px-6">
      <CandidatePortalClient
        candidate={candidatePayload}
        token={token}
        initialChecklistItems={checklistItems}
      />
    </main>
  );
}
