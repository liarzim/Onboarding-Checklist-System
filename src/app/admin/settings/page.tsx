"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Layers,
  FileCheck,
  Building2,
  FolderGit2,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  MoveUp,
  MoveDown,
  ExternalLink,
  ShieldAlert,
  UserPlus,
} from "lucide-react";
import type { SettingStage, DocumentType, Vendor, AdminUser } from "@/types/schema";

const FALLBACK_DOCUMENTS: DocumentType[] = [
  { doc_type_id: "doc_1", doc_name: "שאלון אישי רמה 5", is_required: true, order_index: 1, template_drive_url: "" },
  { doc_type_id: "doc_2", doc_name: "עלון מידע לנבדק", is_required: true, order_index: 2, template_drive_url: "" },
  { doc_type_id: "doc_3", doc_name: "הצהרה על קבלת כרטיס חכם", is_required: true, order_index: 3, template_drive_url: "" },
  { doc_type_id: "doc_4", doc_name: "הסכמה למסירת מידע פלילי", is_required: true, order_index: 4, template_drive_url: "" },
  { doc_type_id: "doc_5", doc_name: "התחייבות לשמירת סודיות", is_required: true, order_index: 5, template_drive_url: "" },
  { doc_type_id: "doc_6", doc_name: "התחייבות לשמירת פרטיות", is_required: true, order_index: 6, template_drive_url: "" },
  { doc_type_id: "doc_7", doc_name: "הימנעות מעבירות מחשב", is_required: true, order_index: 7, template_drive_url: "" },
  { doc_type_id: "doc_8", doc_name: "הסכמה לניטור סייבר", is_required: true, order_index: 8, template_drive_url: "" },
  { doc_type_id: "doc_9", doc_name: "בקשה להנפקת כרטיס חכם", is_required: true, order_index: 9, template_drive_url: "" },
];

const FALLBACK_STAGES: SettingStage[] = [
  { stage_id: "stage_1", stage_name: "איסוף מסמכים ראשוני", stage_order: 1, is_terminal: false },
  { stage_id: "stage_2", stage_name: "בדיקת ביטחון שדה", stage_order: 2, is_terminal: false },
  { stage_id: "stage_3", stage_name: "אימות מסמכים ומשאבי אנוש", stage_order: 3, is_terminal: false },
  { stage_id: "stage_4", stage_name: "מוכן להנפקת כרטיס חכם", stage_order: 4, is_terminal: false },
  { stage_id: "stage_completed", stage_name: "הושלם והונפק כרטיס", stage_order: 5, is_terminal: true },
];

const FALLBACK_PROJECTS = ["פרויקט אלפא", "פרויקט סייבר", "פרויקט ענן", "פרויקט תשתיות"];

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<"stages" | "documents" | "vendors" | "projects" | "admins">("stages");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form State initialized with defaults
  const [stages, setStages] = useState<SettingStage[]>(FALLBACK_STAGES);
  const [documents, setDocuments] = useState<DocumentType[]>(FALLBACK_DOCUMENTS);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [projects, setProjects] = useState<string[]>(FALLBACK_PROJECTS);
  const [admins, setAdmins] = useState<AdminUser[]>([]);

  // Selected or New Vendor modal/row state
  const [vendorForm, setVendorForm] = useState<Vendor>({
    vendor_id: "",
    company_name: "",
    contact_name: "",
    contact_email: "",
    is_active: true,
  });
  const [isEditingVendor, setIsEditingVendor] = useState(false);

  // New Project Input
  const [newProjectName, setNewProjectName] = useState("");

  // New Admin Form State
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<"Admin" | "HR">("Admin");
  const [newAdminPassword, setNewAdminPassword] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings");
      const json = await res.json();
      if (res.ok && json.success) {
        setStages(
          json.data.stages && json.data.stages.length > 0
            ? json.data.stages
            : FALLBACK_STAGES
        );
        setDocuments(
          json.data.document_types && json.data.document_types.length > 0
            ? json.data.document_types
            : FALLBACK_DOCUMENTS
        );
        setVendors(json.data.vendors || []);
        setProjects(
          json.data.projects && json.data.projects.length > 0
            ? json.data.projects
            : FALLBACK_PROJECTS
        );
        setAdmins(json.data.admins || []);
      } else {
        setStages(FALLBACK_STAGES);
        setDocuments(FALLBACK_DOCUMENTS);
        setProjects(FALLBACK_PROJECTS);
        setMessage({
          type: "error",
          text: json.message || "שגיאה בטעינת נתוני הגדרות, נטענו נתוני ברירת מחדל",
        });
      }
    } catch {
      setStages(FALLBACK_STAGES);
      setDocuments(FALLBACK_DOCUMENTS);
      setProjects(FALLBACK_PROJECTS);
      setMessage({
        type: "error",
        text: "שגיאת תקשורת בטעינת הגדרות מערכת, נטענו נתוני ברירת מחדל",
      });
    } finally {
      setLoading(false);
    }
  }

  // --- STAGES HANDLERS ---
  function handleMoveStage(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const updated = [...stages];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Recalculate stage_order
    const reordered = updated.map((s, i) => ({ ...s, stage_order: i + 1 }));
    setStages(reordered);
  }

  function handleAddStage() {
    const newId = `stage_${Date.now()}`;
    const newStage: SettingStage = {
      stage_id: newId,
      stage_name: "שלב תהליך חדש",
      stage_order: stages.length + 1,
      is_terminal: false,
    };
    setStages([...stages, newStage]);
  }

  function handleDeleteStage(index: number) {
    if (stages.length <= 1) {
      alert("חובה להשאיר לפחות שלב תהליך אחד");
      return;
    }
    const updated = stages.filter((_, i) => i !== index);
    const reordered = updated.map((s, i) => ({ ...s, stage_order: i + 1 }));
    setStages(reordered);
  }

  async function handleSaveStages() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/stages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stages }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMessage({ type: "success", text: "שלבי התהליך נשמרו בהצלחה בטבלה" });
      } else {
        setMessage({ type: "error", text: json.message || "שגיאה בשמירת שלבים" });
      }
    } catch {
      setMessage({ type: "error", text: "שגיאת תקשורת בעת שמירת שלבים" });
    } finally {
      setSaving(false);
    }
  }

  // --- DOCUMENTS HANDLERS ---
  function handleAddDocument() {
    const newId = `doc_${Date.now()}`;
    const newDoc: DocumentType = {
      doc_type_id: newId,
      doc_name: "טופס חדש",
      is_required: true,
      template_drive_url: "",
      order_index: documents.length + 1,
    };
    setDocuments([...documents, newDoc]);
  }

  function handleDeleteDocument(index: number) {
    if (documents.length <= 1) {
      alert("חובה להשאיר לפחות מסמך אחד");
      return;
    }
    const updated = documents.filter((_, i) => i !== index);
    setDocuments(updated);
  }

  async function handleSaveDocuments() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/documents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMessage({ type: "success", text: "הגדרות המסמכים עודכנו בהצלחה" });
      } else {
        setMessage({ type: "error", text: json.message || "שגיאה בשמירת מסמכים" });
      }
    } catch {
      setMessage({ type: "error", text: "שגיאת תקשורת בעת שמירת מסמכים" });
    } finally {
      setSaving(false);
    }
  }

  // --- VENDORS HANDLERS ---
  async function handleSaveVendor(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendorForm),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMessage({ type: "success", text: `הספק ${vendorForm.company_name} נשמר בהצלחה` });
        // Update local state
        const exists = vendors.some((v) => v.vendor_id === vendorForm.vendor_id);
        if (exists) {
          setVendors(vendors.map((v) => (v.vendor_id === vendorForm.vendor_id ? vendorForm : v)));
        } else {
          setVendors([...vendors, vendorForm]);
        }
        setIsEditingVendor(false);
        setVendorForm({
          vendor_id: "",
          company_name: "",
          contact_name: "",
          contact_email: "",
          is_active: true,
        });
      } else {
        setMessage({ type: "error", text: json.message || "שגיאה בשמירת ספק" });
      }
    } catch {
      setMessage({ type: "error", text: "שגיאת תקשורת בשמירת ספק" });
    } finally {
      setSaving(false);
    }
  }

  // --- PROJECTS HANDLERS ---
  function handleAddProject() {
    const trimmed = newProjectName.trim();
    if (!trimmed) return;
    if (projects.includes(trimmed)) {
      alert("פרויקט בשם זה כבר קיים");
      return;
    }
    setProjects([...projects, trimmed]);
    setNewProjectName("");
  }

  function handleDeleteProject(pName: string) {
    setProjects(projects.filter((p) => p !== pName));
  }

  async function handleSaveProjects() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMessage({ type: "success", text: "רשימת הפרויקטים נשמרה בהצלחה" });
      } else {
        setMessage({ type: "error", text: json.message || "שגיאה בשמירת פרויקטים" });
      }
    } catch {
      setMessage({ type: "error", text: "שגיאת תקשורת בשמירת פרויקטים" });
    } finally {
      setSaving(false);
    }
  }

  // --- ADMINS HANDLERS ---
  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault();
    const emailTrimmed = newAdminEmail.trim().toLowerCase();
    const nameTrimmed = newAdminName.trim();
    if (!emailTrimmed || !nameTrimmed) return;

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailTrimmed,
          full_name: nameTrimmed,
          role: newAdminRole,
          initial_password: newAdminPassword.trim(),
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMessage({ type: "success", text: json.message });
        setNewAdminEmail("");
        setNewAdminName("");
        setNewAdminPassword("");
        await fetchSettings();
      } else {
        setMessage({ type: "error", text: json.message || "שגיאה בהוספת מנהל" });
      }
    } catch {
      setMessage({ type: "error", text: "שגיאת תקשורת בהוספת מנהל" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAdmin(email: string) {
    if (!confirm(`האם אתה בטוח שברצונך להסיר את הרשאת הניהול עבור ${email}?`)) {
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/settings/admins?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMessage({ type: "success", text: json.message });
        await fetchSettings();
      } else {
        setMessage({ type: "error", text: json.message || "שגיאה במחיקת מנהל" });
      }
    } catch {
      setMessage({ type: "error", text: "שגיאת תקשורת במחיקת מנהל" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">הגדרות מערכת ובקרת תצורה</h1>
            <p className="text-sm text-slate-500">
              ניהול שלבי תהליך הקליטה, רשימת מסמכי חובה, ספקי כח אדם ופרויקטים ארגוניים
            </p>
          </div>
        </div>

        <button
          onClick={fetchSettings}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>רענון נתונים</span>
        </button>
      </div>

      {/* Notification Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 gap-2 shadow-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab("stages")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === "stages"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>שלבי תהליך ({stages.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("documents")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === "documents"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>ניהול טפסים ({documents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("vendors")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === "vendors"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>ניהול ספקים ({vendors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("projects")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === "projects"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <FolderGit2 className="w-4 h-4" />
          <span>ניהול פרויקטים ({projects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("admins")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === "admins"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>מנהלי מערכת ({admins.length})</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="bg-white p-6 rounded-b-xl border border-t-0 border-slate-200 shadow-sm min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-sm">טוען הגדרות מגיליון הניהול...</span>
          </div>
        ) : (
          <>
            {/* TAB 1: STAGES */}
            {activeTab === "stages" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">שלבי מחזור חיי קליטת מועמד</h2>
                    <p className="text-xs text-slate-500">
                      הגדר את רצף השלבים, סדר ביצוע, וסמן שלב סיום סופי (Terminal Stage)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddStage}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>הוסף שלב חדש</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveStages}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{saving ? "שומר..." : "שמור שינויים"}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {stages.map((st, idx) => (
                    <div
                      key={st.stage_id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {st.stage_order}
                        </div>
                        <div className="flex-1 space-y-1">
                          <input
                            type="text"
                            value={st.stage_name}
                            onChange={(e) => {
                              const updated = [...stages];
                              updated[idx].stage_name = e.target.value;
                              setStages(updated);
                            }}
                            placeholder="שם שלב"
                            className="text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded px-2.5 py-1 w-full max-w-xs focus:ring-1 focus:ring-blue-500"
                          />
                          <div className="text-[11px] text-slate-400 font-mono">
                            מזהה: {st.stage_id}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={st.is_terminal}
                            onChange={(e) => {
                              const updated = [...stages];
                              updated[idx].is_terminal = e.target.checked;
                              setStages(updated);
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                          />
                          <span>שלב סופי ומסיים</span>
                        </label>

                        <div className="flex items-center gap-1 border-r border-slate-300 pr-3">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveStage(idx, "up")}
                            title="הזז למעלה"
                            className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-200 transition"
                          >
                            <MoveUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === stages.length - 1}
                            onClick={() => handleMoveStage(idx, "down")}
                            title="הזז למטה"
                            className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-200 transition"
                          >
                            <MoveDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStage(idx)}
                            title="מחק שלב"
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition ml-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: DOCUMENTS */}
            {activeTab === "documents" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">קטלוג טפסי חובה ותבניות להורדה</h2>
                    <p className="text-xs text-slate-500">
                      קביעת כותרות המסמכים, הגדרת מסמכי חובה לעצירת סיום קליטה, וקישורי Drive לתבניות
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddDocument}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>הוסף מסמך חדש</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDocuments}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{saving ? "שומר..." : "שמור שינויים"}</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                        <th className="py-2.5 px-3 font-semibold">סדר</th>
                        <th className="py-2.5 px-3 font-semibold">שם המסמך / טופס</th>
                        <th className="py-2.5 px-3 font-semibold text-center">מסמך חובה?</th>
                        <th className="py-2.5 px-3 font-semibold">קישור לתבנית ריקה (Google Drive URL)</th>
                        <th className="py-2.5 px-3 font-semibold text-center">פעולות</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {documents.map((doc, idx) => (
                        <tr key={doc.doc_type_id} className="hover:bg-slate-50/70 transition">
                          <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={doc.doc_name}
                              onChange={(e) => {
                                const updated = [...documents];
                                updated[idx].doc_name = e.target.value;
                                setDocuments(updated);
                              }}
                              className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
                              placeholder="שם מסמך"
                            />
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                              ID: {doc.doc_type_id}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={doc.is_required}
                              onChange={(e) => {
                                const updated = [...documents];
                                updated[idx].is_required = e.target.checked;
                                setDocuments(updated);
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="url"
                                value={doc.template_drive_url || ""}
                                onChange={(e) => {
                                  const updated = [...documents];
                                  updated[idx].template_drive_url = e.target.value;
                                  setDocuments(updated);
                                }}
                                placeholder="https://drive.google.com/..."
                                className="w-full text-xs text-slate-700 bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 font-mono"
                              />
                              {doc.template_drive_url && (
                                <a
                                  href={doc.template_drive_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                                  title="פתח קישור"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(idx)}
                              title="מחק מסמך מהרשימה"
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: VENDORS */}
            {activeTab === "vendors" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">ספקי כח אדם ומיקור חוץ מורשים</h2>
                    <p className="text-xs text-slate-500">
                      ניהול פרטי ספקים מורשים, אימייל איש קשר להזדהות קוד קסם וסטטוס פעילות
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setVendorForm({
                        vendor_id: `vnd_${Date.now().toString().slice(-4)}`,
                        company_name: "",
                        contact_name: "",
                        contact_email: "",
                        is_active: true,
                      });
                      setIsEditingVendor(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>הוסף ספק חדש</span>
                  </button>
                </div>

                {/* Vendor Form Card (When adding or editing) */}
                {isEditingVendor && (
                  <form
                    onSubmit={handleSaveVendor}
                    className="p-4 bg-slate-50 border border-blue-200 rounded-xl space-y-4 shadow-sm"
                  >
                    <h3 className="text-sm font-bold text-slate-800">
                      {vendors.some((v) => v.vendor_id === vendorForm.vendor_id)
                        ? "עריכת פרטי ספק"
                        : "הקמת ספק מורשה חדש"}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          מזהה ספק (Vendor ID)
                        </label>
                        <input
                          type="text"
                          required
                          value={vendorForm.vendor_id}
                          onChange={(e) =>
                            setVendorForm({ ...vendorForm, vendor_id: e.target.value })
                          }
                          className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          שם החברה / הספק
                        </label>
                        <input
                          type="text"
                          required
                          value={vendorForm.company_name}
                          onChange={(e) =>
                            setVendorForm({ ...vendorForm, company_name: e.target.value })
                          }
                          className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          שם איש קשר
                        </label>
                        <input
                          type="text"
                          required
                          value={vendorForm.contact_name}
                          onChange={(e) =>
                            setVendorForm({ ...vendorForm, contact_name: e.target.value })
                          }
                          className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          אימייל איש קשר (להתחברות)
                        </label>
                        <input
                          type="email"
                          required
                          value={vendorForm.contact_email}
                          onChange={(e) =>
                            setVendorForm({ ...vendorForm, contact_email: e.target.value })
                          }
                          className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vendorForm.is_active}
                          onChange={(e) =>
                            setVendorForm({ ...vendorForm, is_active: e.target.checked })
                          }
                          className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <span>ספק פעיל במערכת</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingVendor(false)}
                          className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded transition"
                        >
                          ביטול
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{saving ? "שומר..." : "שמור ספק בגיליון"}</span>
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Vendors Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                        <th className="py-2.5 px-3 font-semibold">מזהה</th>
                        <th className="py-2.5 px-3 font-semibold">שם החברה</th>
                        <th className="py-2.5 px-3 font-semibold">איש קשר</th>
                        <th className="py-2.5 px-3 font-semibold">אימייל התחברות</th>
                        <th className="py-2.5 px-3 font-semibold text-center">סטטוס</th>
                        <th className="py-2.5 px-3 font-semibold text-center">פעולות</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {vendors.map((vnd) => (
                        <tr key={vnd.vendor_id} className="hover:bg-slate-50/70 transition">
                          <td className="py-2.5 px-3 font-mono text-slate-500">{vnd.vendor_id}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">{vnd.company_name}</td>
                          <td className="py-2.5 px-3 text-slate-600">{vnd.contact_name}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{vnd.contact_email}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                vnd.is_active
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-500 border border-slate-200"
                              }`}
                            >
                              {vnd.is_active ? "פעיל" : "מושבת"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setVendorForm(vnd);
                                setIsEditingVendor(true);
                              }}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              ערוך
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: PROJECTS */}
            {activeTab === "projects" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">פרויקטי קליטה ומערכות יעד</h2>
                    <p className="text-xs text-slate-500">
                      הגדרת רשימת הפרויקטים לבחירה בעת פתיחת מועמד חדש על ידי הספק
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveProjects}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? "שומר..." : "שמור רשימת פרויקטים"}</span>
                  </button>
                </div>

                {/* Add Project Input */}
                <div className="flex items-center gap-2 max-w-md">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddProject()}
                    placeholder="הזן שם פרויקט להוספה..."
                    className="flex-1 text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddProject}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>הוסף</span>
                  </button>
                </div>

                {/* Projects Badge Cloud / List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {projects.map((proj) => (
                    <div
                      key={proj}
                      className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 transition"
                    >
                      <span className="text-xs font-bold text-slate-800">{proj}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteProject(proj)}
                        title="מחק פרויקט"
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: ADMINS & HR MANAGERS */}
            {activeTab === "admins" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      ניהול מנהלי מערכת ומשאבי אנוש (Admins / HR)
                    </h2>
                    <p className="text-xs text-slate-500">
                      הוספה והסרה של חשבונות מורשים לכניסה ישירה באמצעות Google OAuth ופורטל הניהול
                    </p>
                  </div>
                </div>

                {/* Add New Admin Form */}
                <form
                  onSubmit={handleAddAdmin}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
                >
                  <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-blue-600" />
                    <span>הוספת מנהל / נציג HR חדש</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        כתובת אימייל (Google / ארגוני)
                      </label>
                      <input
                        type="email"
                        required
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="user@gmail.com"
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        שם מלא
                      </label>
                      <input
                        type="text"
                        required
                        value={newAdminName}
                        onChange={(e) => setNewAdminName(e.target.value)}
                        placeholder="ישראל ישראלי"
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        סיסמה ראשונית (אופציונלי)
                      </label>
                      <input
                        type="password"
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                        placeholder="לפחות 6 תווים"
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        המשתמש יחויב להחליפה בכניסה ראשונה
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        תפקיד במערכת
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          value={newAdminRole}
                          onChange={(e) => setNewAdminRole(e.target.value as "Admin" | "HR")}
                          className="flex-1 text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="Admin">מנהל מערכת (Admin)</option>
                          <option value="HR">משאבי אנוש (HR)</option>
                        </select>
                        <button
                          type="submit"
                          disabled={saving}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 shrink-0 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{saving ? "שומר..." : "הוסף"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </form>

                {/* Admins Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                        <th className="py-2.5 px-3 font-semibold">שם מלא</th>
                        <th className="py-2.5 px-3 font-semibold">אימייל</th>
                        <th className="py-2.5 px-3 font-semibold text-center">תפקיד</th>
                        <th className="py-2.5 px-3 font-semibold text-center">אופן כניסה / סטטוס סיסמה</th>
                        <th className="py-2.5 px-3 font-semibold">תאריך צירוף</th>
                        <th className="py-2.5 px-3 font-semibold text-center">פעולות</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {admins.map((adm) => {
                        const isPrimary = adm.email.toLowerCase() === "michael.liarzi@gmail.com";
                        return (
                          <tr key={adm.email} className="hover:bg-slate-50/70 transition">
                            <td className="py-2.5 px-3 font-bold text-slate-800">
                              {adm.full_name}
                              {isPrimary && (
                                <span className="mr-2 text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-normal">
                                  ראשי
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {adm.email}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                  adm.role === "Admin"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-blue-50 text-blue-700 border-blue-200"
                                }`}
                              >
                                {adm.role === "Admin" ? "מנהל מערכת (Admin)" : "משאבי אנוש (HR)"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {adm.must_change_password ? (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                  ממתין להחלפת סיסמה ראשונית
                                </span>
                              ) : adm.password_hash ? (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  סיסמה אישית פעילה + Google
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                  Google OAuth בלבד
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {adm.added_at && !isNaN(Date.parse(adm.added_at))
                                ? new Date(adm.added_at).toLocaleDateString("he-IL")
                                : adm.added_at || "-"}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isPrimary ? (
                                <span className="text-[11px] text-slate-400">מוגן</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAdmin(adm.email)}
                                  title="הסר הרשאת מנהל"
                                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
