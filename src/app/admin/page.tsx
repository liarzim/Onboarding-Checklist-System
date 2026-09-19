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
} from "lucide-react";

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

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>רענן נתונים</span>
        </button>
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
    </div>
  );
}
