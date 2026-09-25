"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Archive,
  Search,
  Building,
  Folder,
  ExternalLink,
  ChevronLeft,
  Loader2,
  Calendar,
  AlertCircle,
  FileCheck2,
  RefreshCw,
} from "lucide-react";
import CandidatePortalLink from "@/components/common/CandidatePortalLink";

interface CompletedCandidate {
  candidate_id: string;
  access_token?: string | null;
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
  created_at: string;
  updated_at: string;
}

interface VendorOption {
  vendor_id: string;
  company_name: string;
}

export default function CompletedCandidatesPage() {
  const [candidates, setCandidates] = useState<CompletedCandidate[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  async function loadCompletedCandidates() {
    try {
      setLoading(true);
      setError(null);

      const [candidatesRes, metaRes] = await Promise.all([
        fetch("/api/admin/candidates?status=completed"),
        fetch("/api/admin/meta"),
      ]);

      if (!candidatesRes.ok) {
        throw new Error("שגיאה בטעינת ארכיון המועמדים");
      }
      if (!metaRes.ok) {
        throw new Error("שגיאה בטעינת נתוני מערכת");
      }

      const candidatesData = await candidatesRes.json();
      const metaData = await metaRes.json();

      setCandidates(candidatesData.candidates || []);
      setVendors(metaData.vendors || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינה");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompletedCandidates();
  }, []);

  const uniqueProjects = Array.from(
    new Set(candidates.map((c) => c.project_id).filter(Boolean))
  );

  const filteredCandidates = candidates.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      c.full_name.toLowerCase().includes(q) ||
      c.id_number.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q);

    const matchesVendor = !selectedVendor || c.vendor_id === selectedVendor;
    const matchesProject = !selectedProject || c.project_id === selectedProject;

    let matchesDate = true;
    if (fromDate) {
      matchesDate = matchesDate && new Date(c.updated_at) >= new Date(fromDate);
    }
    if (toDate) {
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && new Date(c.updated_at) <= endOfDay;
    }

    return matchesSearch && matchesVendor && matchesProject && matchesDate;
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2.5">
            <Archive className="w-7 h-7 text-blue-600" />
            <span>ארכיון מועמדים שהושלמו (ביקורת וציות)</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            מאגר המועמדים שתהליך הקליטה שלהם הסתיים והונפק להם כרטיס חכם
          </p>
        </div>

        <button
          onClick={loadCompletedCandidates}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>רענן ארכיון</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש לפי שם או ת.ז..."
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

          {/* From Date */}
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              title="מתאריך סיום"
              className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
            />
          </div>

          {/* To Date */}
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              title="עד תאריך סיום"
              className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
            />
          </div>
        </div>

        {(searchQuery || selectedVendor || selectedProject || fromDate || toDate) && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span>נמצאו {filteredCandidates.length} מועמדים בארכיון</span>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedVendor("");
                setSelectedProject("");
                setFromDate("");
                setToDate("");
              }}
              className="text-blue-600 hover:underline font-medium"
            >
              איפוס סינונים
            </button>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadCompletedCandidates}
            className="text-xs font-semibold underline hover:no-underline"
          >
            נסה שוב
          </button>
        </div>
      )}

      {/* Archive Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="text-sm font-medium text-slate-500">
            טוען ארכיון מועמדים...
          </span>
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <Archive className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">
            טרם הושלמו מועמדים בארכיון
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            כאשר תאשר הנפקת כרטיס חכם למועמד פעיל, התיק יועבר אוטומטית לארכיון זה.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-4 px-6">שם המועמד</th>
                  <th className="py-4 px-6">ת.ז.</th>
                  <th className="py-4 px-6">חברת ספק</th>
                  <th className="py-4 px-6">פרויקט</th>
                  <th className="py-4 px-6">תאריך אישור והנפקה</th>
                  <th className="py-4 px-6">לינק מועמד</th>
                  <th className="py-4 px-6">תיקיית Drive קבועה</th>
                  <th className="py-4 px-6 text-left">תיק מועמד</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredCandidates.map((candidate) => (
                  <tr key={candidate.candidate_id} className="hover:bg-slate-50/50 transition">
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
                    <td className="py-4 px-6 text-xs text-slate-600">
                      {new Date(candidate.updated_at).toLocaleString("he-IL")}
                    </td>
                    <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                      <CandidatePortalLink
                        candidateId={candidate.candidate_id}
                        accessToken={candidate.access_token}
                        candidateName={candidate.full_name}
                        candidatePhone={candidate.phone}
                        variant="table-row"
                      />
                    </td>
                    <td className="py-4 px-6">
                      {candidate.drive_folder_id ? (
                        <a
                          href={`https://drive.google.com/drive/folders/${candidate.drive_folder_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                        >
                          <Folder className="w-3.5 h-3.5" />
                          <span>פתיחה ב-Drive</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-left">
                      <Link
                        href={`/admin/candidate/${candidate.candidate_id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
                      >
                        <FileCheck2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>צפייה בתיק</span>
                        <ChevronLeft className="w-3 h-3" />
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
