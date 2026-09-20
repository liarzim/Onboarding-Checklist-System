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
  Copy,
  Check,
  Cloud,
  HardDrive,
  FileSpreadsheet,
  Play,
  Info,
  Sparkles,
  KeyRound,
  UploadCloud,
  FileJson,
  FileCode,
  Unlink,
  ChevronDown,
  ChevronUp,
  FolderPlus,
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
  const [activeTab, setActiveTab] = useState<
    "stages" | "documents" | "vendors" | "projects" | "admins" | "google"
  >("stages");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Helper to change tab and persist to URL and localStorage
  function handleTabChange(
    tab: "stages" | "documents" | "vendors" | "projects" | "admins" | "google"
  ) {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("admin_settings_active_tab", tab);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", tab);
        window.history.replaceState({}, "", url.toString());
      } catch {
        // Ignore
      }
    }
  }

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

  // Google Sheets & Drive Connection State
  const [googleAuthMode, setGoogleAuthMode] = useState<"service_account" | "oauth">("service_account");
  const [googleServiceEmail, setGoogleServiceEmail] = useState("");
  const [googlePrivateKeyConfigured, setGooglePrivateKeyConfigured] = useState(false);
  const [isOauthConnected, setIsOauthConnected] = useState(false);
  const [oauthEmail, setOauthEmail] = useState("");
  const [googleSpreadsheetId, setGoogleSpreadsheetId] = useState("");
  const [googleDriveFolderId, setGoogleDriveFolderId] = useState("");
  const [googleSpreadsheetUrl, setGoogleSpreadsheetUrl] = useState("");
  const [googleDriveFolderUrl, setGoogleDriveFolderUrl] = useState("");
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [savingGoogle, setSavingGoogle] = useState(false);

  // Service Account JSON form state
  const [showJsonForm, setShowJsonForm] = useState(false);
  const [serviceAccountJson, setServiceAccountJson] = useState("");
  const [savingJson, setSavingJson] = useState(false);

  // Auto Create Resources state
  const [autoCreateLoading, setAutoCreateLoading] = useState(false);
  const [autoCreateShareEmail, setAutoCreateShareEmail] = useState("");
  const [parentFolderMode, setParentFolderMode] = useState<"root" | "existing">("root");
  const [parentFolderId, setParentFolderId] = useState("");
  const [sheetPlacement, setSheetPlacement] = useState<"inside_folder" | "same_level">("inside_folder");
  const [customFolderName, setCustomFolderName] = useState("מערכת Onboarding - תיקיית קליטה ראשית");
  const [customSheetName, setCustomSheetName] = useState("מערכת קליטת מועמדים - נתוני Onboarding");
  const [driveFoldersList, setDriveFoldersList] = useState<{ id: string; name: string }[]>([]);
  const [loadingDriveFolders, setLoadingDriveFolders] = useState(false);
  const [showLocationSettings, setShowLocationSettings] = useState(false);

  const [testResult, setTestResult] = useState<{
    credentialsOk: boolean;
    sheetsOk: boolean;
    sheetsDetails: string;
    driveOk: boolean;
    driveDetails: string;
    overallHealthy: boolean;
  } | null>(null);

  useEffect(() => {
    // Check URL query parameters or localStorage for active tab
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      const gSuccess = params.get("googleSuccess");
      const gError = params.get("googleError");

      if (gSuccess) {
        handleTabChange("google");
        setMessage({ type: "success", text: gSuccess });
        window.history.replaceState({}, "", "/admin/settings?tab=google");
      } else if (gError) {
        handleTabChange("google");
        setMessage({ type: "error", text: gError });
        window.history.replaceState({}, "", "/admin/settings?tab=google");
      } else if (
        tabParam &&
        ["stages", "documents", "vendors", "projects", "admins", "google"].includes(tabParam)
      ) {
        setActiveTab(tabParam as any);
      } else {
        const savedTab = localStorage.getItem("admin_settings_active_tab");
        if (
          savedTab &&
          ["stages", "documents", "vendors", "projects", "admins", "google"].includes(savedTab)
        ) {
          setActiveTab(savedTab as any);
        }
      }
    }

    fetchSettings();
    fetchGoogleConnection();
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

  // --- GOOGLE CONNECTION HANDLERS ---
  async function fetchGoogleConnection() {
    try {
      const res = await fetch("/api/admin/settings/google-connection");
      const json = await res.json();
      if (res.ok && json.success) {
        setGoogleAuthMode(json.data.authMode || "service_account");
        setGoogleServiceEmail(json.data.serviceAccountEmail || "");
        setGooglePrivateKeyConfigured(Boolean(json.data.isPrivateKeyConfigured));
        setIsOauthConnected(Boolean(json.data.isOauthConnected));
        setOauthEmail(json.data.oauthEmail || "");
        setGoogleSpreadsheetId(json.data.spreadsheetId || "");
        setGoogleDriveFolderId(json.data.driveFolderId || "");
        setGoogleSpreadsheetUrl(json.data.spreadsheetUrl || "");
        setGoogleDriveFolderUrl(json.data.driveFolderUrl || "");
      }
    } catch {
      // Ignore
    }
  }

  async function handleSaveServiceAccountJson(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceAccountJson.trim()) return;
    setSavingJson(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/google-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceAccountJson: serviceAccountJson.trim(),
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMessage({
          type: "success",
          text: "מפתח חשבון שירות (Service Account) נשמר ואומת בהצלחה!",
        });
        setGoogleServiceEmail(json.data.serviceAccountEmail || "");
        setGooglePrivateKeyConfigured(Boolean(json.data.isPrivateKeyConfigured));
        setGoogleAuthMode("service_account");
        setServiceAccountJson("");
        setShowJsonForm(false);
        await handleTestGoogleConnection();
      } else {
        setMessage({
          type: "error",
          text: json.message || "שגיאה בפענוח קובץ ה-JSON של חשבון השירות",
        });
      }
    } catch {
      setMessage({ type: "error", text: "שגיאת תקשורת בשמירת קובץ ה-JSON" });
    } finally {
      setSavingJson(false);
    }
  }

  async function fetchDriveFolders() {
    setLoadingDriveFolders(true);
    try {
      const res = await fetch("/api/admin/settings/google-connection/drive-folders");
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.folders)) {
        setDriveFoldersList(json.folders);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingDriveFolders(false);
    }
  }

  async function handleAutoCreateResources() {
    setAutoCreateLoading(true);
    setMessage(null);
    try {
      const res = await fetch(
        "/api/admin/settings/google-connection/create-resources",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shareWithEmail: autoCreateShareEmail || undefined,
            folderName: customFolderName || undefined,
            spreadsheetTitle: customSheetName || undefined,
            parentFolderId: parentFolderMode === "existing" ? parentFolderId : undefined,
            sheetPlacement: sheetPlacement,
          }),
        }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setMessage({ type: "success", text: json.message });
        setGoogleSpreadsheetId(json.data.spreadsheetId || "");
        setGoogleDriveFolderId(json.data.driveFolderId || "");
        setGoogleSpreadsheetUrl(json.data.spreadsheetUrl || "");
        setGoogleDriveFolderUrl(json.data.driveFolderUrl || "");

        // Immediately test the newly created resources
        await handleTestGoogleConnection(
          json.data.spreadsheetId,
          json.data.driveFolderId
        );
        // Refresh all settings tabs so newly populated data appears immediately
        await fetchSettings();
      } else {
        setMessage({
          type: "error",
          text: json.message || "שגיאה ביצירת הגיליון והתיקייה האוטומטית",
        });
      }
    } catch {
      setMessage({
        type: "error",
        text: "שגיאת תקשורת בעת יצירת המשאבים ב-Google",
      });
    } finally {
      setAutoCreateLoading(false);
    }
  }

  async function handleDisconnectOauth() {
    if (!confirm("האם אתה בטוח שברצונך לנתק את חשבון Google של האדמין?")) {
      return;
    }
    try {
      const res = await fetch("/api/admin/settings/google-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disconnectOauth: true }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setIsOauthConnected(false);
        setOauthEmail("");
        setGoogleAuthMode("service_account");
        setMessage({ type: "success", text: "חשבון Google נותק בהצלחה" });
        await fetchGoogleConnection();
      }
    } catch {
      setMessage({ type: "error", text: "שגיאה בניתוק חשבון Google" });
    }
  }

  async function handleSaveGoogleConnection(e: React.FormEvent) {
    e.preventDefault();
    setSavingGoogle(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/google-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetId: googleSpreadsheetId,
          driveFolderId: googleDriveFolderId,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMessage({ type: "success", text: json.message });
        setGoogleSpreadsheetId(json.data.spreadsheetId || "");
        setGoogleDriveFolderId(json.data.driveFolderId || "");
        setGoogleSpreadsheetUrl(json.data.spreadsheetUrl || "");
        setGoogleDriveFolderUrl(json.data.driveFolderUrl || "");

        // Automatically trigger live test after saving
        await handleTestGoogleConnection(
          json.data.spreadsheetId,
          json.data.driveFolderId
        );
        // Refresh settings so other tabs update immediately with any sheet data
        await fetchSettings();
      } else {
        setMessage({
          type: "error",
          text: json.message || "שגיאה בשמירת הגדרות החיבור ל-Google",
        });
      }
    } catch {
      setMessage({ type: "error", text: "שגיאת תקשורת בשמירת הגדרות חיבור" });
    } finally {
      setSavingGoogle(false);
    }
  }

  async function handleTestGoogleConnection(
    customSpreadsheet?: string,
    customDrive?: string
  ) {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/settings/google-connection/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetId:
            customSpreadsheet !== undefined
              ? customSpreadsheet
              : googleSpreadsheetId,
          driveFolderId:
            customDrive !== undefined ? customDrive : googleDriveFolderId,
        }),
      });
      const json = await res.json();
      if (json.result) {
        setTestResult(json.result);
      }
    } catch {
      setTestResult({
        credentialsOk: false,
        sheetsOk: false,
        sheetsDetails: "שגיאת תקשורת בעת בדיקת החיבור",
        driveOk: false,
        driveDetails: "שגיאת תקשורת בעת בדיקת החיבור",
        overallHealthy: false,
      });
    } finally {
      setTestLoading(false);
    }
  }

  function handleCopyEmail() {
    if (!googleServiceEmail) return;
    navigator.clipboard.writeText(googleServiceEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
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
          onClick={() => handleTabChange("stages")}
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
          onClick={() => handleTabChange("documents")}
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
          onClick={() => handleTabChange("vendors")}
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
          onClick={() => handleTabChange("projects")}
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
          onClick={() => handleTabChange("admins")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === "admins"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>מנהלי מערכת ({admins.length})</span>
        </button>

        <button
          onClick={() => handleTabChange("google")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === "google"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <Cloud className="w-4 h-4 text-emerald-600" />
          <span>חיבור Sheets ו-Drive</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="bg-white p-6 rounded-b-xl border border-t-0 border-slate-200 shadow-sm min-h-[400px]">
        {loading && activeTab !== "google" ? (
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

            {/* TAB 6: GOOGLE SHEETS & DRIVE CONNECTION */}
            {activeTab === "google" && (
              <div className="space-y-6">
                {/* TAB HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Cloud className="w-5 h-5 text-emerald-600" />
                      <span>חיבור ל-Google Sheets ו-Google Drive</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      בחר את החשבון המבוקש לחיבור, צור את הגיליון והתיקייה באופן אוטומטי ובדוק את התקשורת בזמן אמת
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTestGoogleConnection()}
                    disabled={testLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition disabled:opacity-50 shadow-sm self-start sm:self-auto"
                  >
                    {testLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    <span>{testLoading ? "בודק חיבור עכשיו..." : "בדוק חיבור עכשיו"}</span>
                  </button>
                </div>

                {/* DIAGNOSTIC TEST RESULT */}
                {testResult && (
                  <div
                    className={`p-4 rounded-xl border transition-all ${
                      testResult.overallHealthy
                        ? "bg-emerald-50/70 border-emerald-200"
                        : "bg-amber-50/70 border-amber-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-3">
                      {testResult.overallHealthy ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      )}
                      <div>
                        <h4
                          className={`text-sm font-bold ${
                            testResult.overallHealthy
                              ? "text-emerald-900"
                              : "text-amber-900"
                          }`}
                        >
                          {testResult.overallHealthy
                            ? "החיבור ל-Google תקין לחלוטין ומוכן לפעילות"
                            : "נמצאו בעיות בחיבור ל-Google"}
                        </h4>
                        <p className="text-xs text-slate-600">
                          {testResult.overallHealthy
                            ? "גיליון הניהול ותיקיית הדרייב נגישים לקריאה ולכתיבה מלאה על ידי החשבון המחובר."
                            : "ודא שהחשבון מחובר, שהמזהים נכונים ושהוענקו הרשאות עריכה."}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                      {/* Credentials */}
                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-700">אימות חשבון</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              testResult.credentialsOk
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {testResult.credentialsOk ? "מאומת" : "שגיאה"}
                          </span>
                        </div>
                        <p
                          className="text-[11px] text-slate-500 truncate"
                          title={
                            isOauthConnected
                              ? oauthEmail
                              : googleServiceEmail || "לא הוגדר אימייל"
                          }
                        >
                          {isOauthConnected
                            ? `OAuth: ${oauthEmail}`
                            : googleServiceEmail || "לא הוגדר חשבון"}
                        </p>
                      </div>

                      {/* Sheets */}
                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Google Sheets</span>
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              testResult.sheetsOk
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {testResult.sheetsOk ? "תקין" : "אין גישה"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          {testResult.sheetsDetails}
                        </p>
                      </div>

                      {/* Drive */}
                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                            <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                            <span>Google Drive</span>
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              testResult.driveOk
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {testResult.driveOk ? "תקין (עורך)" : "אין גישה"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          {testResult.driveDetails}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* CARD 1: ACCOUNT CONNECTION CHOICE */}
                <div className="p-5 bg-white rounded-xl border border-slate-200 space-y-4 shadow-xs">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                      1
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-blue-600" />
                        <span>חשבון Google לחיבור המערכת</span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        בחר כיצד לחבר את המערכת: חיבור ישיר לחשבון Google של האדמין, או חיבור מפתח שירות (Service Account JSON)
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* OPTION A: OAUTH */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Cloud className="w-4 h-4 text-blue-600" />
                            <span>חיבור חשבון Google של האדמין (OAuth)</span>
                          </h4>
                          {isOauthConnected ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Check className="w-3 h-3" />
                              <span>מחובר</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                              לא מחובר
                            </span>
                          )}
                        </div>

                        {isOauthConnected ? (
                          <div className="space-y-1.5">
                            <p className="text-xs text-slate-600">
                              המערכת מחוברת לחשבון Google של האדמין ומורשית לנהל קבצים וגיליונות ב-Drive:
                            </p>
                            <p className="text-xs font-mono font-bold text-blue-700 bg-white p-2 rounded border border-slate-200 truncate">
                              {oauthEmail}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600 leading-relaxed">
                            התחבר עם חשבון Google האישי או הארגוני שלך בלחיצת כפתור אחת. הגיליונות והקבצים ייווצרו ישירות בתוך ה-Drive שלך.
                          </p>
                        )}
                      </div>

                      <div className="pt-2 flex items-center gap-2">
                        {isOauthConnected ? (
                          <button
                            type="button"
                            onClick={handleDisconnectOauth}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition border border-rose-200"
                          >
                            <Unlink className="w-3.5 h-3.5" />
                            <span>נתק חשבון Google</span>
                          </button>
                        ) : (
                          <a
                            href="/api/auth/google/connect-drive"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm"
                          >
                            <Cloud className="w-3.5 h-3.5" />
                            <span>חבר חשבון Google של האדמין (Drive + Sheets)</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* OPTION B: SERVICE ACCOUNT */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <FileJson className="w-4 h-4 text-emerald-600" />
                            <span>חשבון שירות ייעודי (Service Account JSON)</span>
                          </h4>
                          {googlePrivateKeyConfigured ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Check className="w-3 h-3" />
                              <span>מפתח פעיל</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              חסר מפתח פרטי
                            </span>
                          )}
                        </div>

                        {googlePrivateKeyConfigured ? (
                          <div className="space-y-1.5">
                            <p className="text-xs text-slate-600">
                              כתובת חשבון השירות המוגדרת במערכת:
                            </p>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                readOnly
                                value={googleServiceEmail || ""}
                                dir="ltr"
                                className="w-full text-[11px] font-mono bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 select-all"
                              />
                              <button
                                type="button"
                                onClick={handleCopyEmail}
                                className="p-1.5 bg-white border border-slate-200 rounded hover:bg-slate-100 transition"
                                title="העתק אימייל"
                              >
                                {copiedEmail ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600 leading-relaxed">
                            אם ברשותך קובץ JSON של חשבון שירות מ-Google Cloud Console, ניתן להדביקו כאן לאימות מיידי ללא הגדרת משתני שרת.
                          </p>
                        )}
                      </div>

                      <div className="pt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowJsonForm(!showJsonForm)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition shadow-xs"
                        >
                          <FileJson className="w-3.5 h-3.5 text-slate-600" />
                          <span>{showJsonForm ? "סגור חלון הזנה" : "הדבק / עדכן קובץ JSON"}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* INLINE SERVICE ACCOUNT JSON FORM */}
                  {showJsonForm && (
                    <form
                      onSubmit={handleSaveServiceAccountJson}
                      className="p-4 bg-slate-50 rounded-xl border border-blue-200 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <FileCode className="w-4 h-4 text-blue-600" />
                          <span>הדבק כאן את תוכן קובץ ה-JSON מחשבון השירות:</span>
                        </label>
                        <span className="text-[11px] text-slate-500 font-mono">
                          (client_email &amp; private_key)
                        </span>
                      </div>
                      <textarea
                        rows={6}
                        dir="ltr"
                        value={serviceAccountJson}
                        onChange={(e) => setServiceAccountJson(e.target.value)}
                        placeholder='{"type": "service_account", "project_id": "...", "private_key": "-----BEGIN PRIVATE KEY-----\n...", "client_email": "..."}'
                        className="w-full text-xs font-mono p-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowJsonForm(false)}
                          className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg transition"
                        >
                          ביטול
                        </button>
                        <button
                          type="submit"
                          disabled={savingJson || !serviceAccountJson.trim()}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 shadow-sm"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{savingJson ? "מאמת ושומר..." : "אמת ושמור מפתח"}</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* CARD 2: ONE-CLICK AUTOMATIC SETUP WITH LOCATION OPTIONS */}
                <div className="p-5 bg-gradient-to-br from-blue-50/50 via-white to-emerald-50/40 rounded-xl border-2 border-blue-300 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-blue-100">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                        2
                      </span>
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>הקמת הגיליון והתיקייה באופן אוטומטי בחשבון המחובר</span>
                      </h3>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 self-start sm:self-auto">
                      מומלץ ומהיר בלחיצה אחת
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    המערכת תייצר עבורך באופן מיידי בתוך חשבון ה-Google המחובר: תיקייה ראשית ב-Drive, גיליון נתונים ב-Sheets עם כל 8 הטאבים הנדרשים (Candidates, ChecklistItems, DocumentTypes, SettingStages, Vendors, Projects, Admins, AuditLogs), עמודות הכותרת, שלבי התהליך, רשימת הטפסים והפרויקטים, ותחבר אותם ישירות למערכת.
                  </p>

                  {/* LOCATION SELECTION CONTROLS */}
                  <div className="bg-white p-4 rounded-xl border border-blue-200 space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                      <FolderPlus className="w-4 h-4 text-blue-600" />
                      <span>בחירת מיקום פתיחת התיקייה הראשית והגיליון ב-Google Drive:</span>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* FOLDER LOCATION */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                          <span>היכן לפתוח את התיקייה הראשית?</span>
                        </label>
                        <div className="space-y-1.5">
                          <label className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition text-xs hover:bg-slate-50 border-slate-200">
                            <input
                              type="radio"
                              name="parentFolderMode"
                              checked={parentFolderMode === "root"}
                              onChange={() => setParentFolderMode("root")}
                              className="text-blue-600"
                            />
                            <div className="flex-1">
                              <span className="font-semibold text-slate-800">האחסון שלי (My Drive - תיקייה ראשית)</span>
                              <p className="text-[11px] text-slate-500">התיקייה תיווצר ישירות בשורש ה-Drive</p>
                            </div>
                          </label>

                          <label className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition text-xs hover:bg-slate-50 border-slate-200">
                            <input
                              type="radio"
                              name="parentFolderMode"
                              checked={parentFolderMode === "existing"}
                              onChange={() => {
                                setParentFolderMode("existing");
                                if (driveFoldersList.length === 0) {
                                  fetchDriveFolders();
                                }
                              }}
                              className="text-blue-600"
                            />
                            <div className="flex-1">
                              <span className="font-semibold text-slate-800">בתוך תיקייה קיימת (תת-תיקייה)</span>
                              <p className="text-[11px] text-slate-500">בחר מתוך התיקיות הקיימות או הדבק קישור</p>
                            </div>
                          </label>
                        </div>

                        {parentFolderMode === "existing" && (
                          <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-700">בחר תיקיית יעד:</span>
                              <button
                                type="button"
                                onClick={fetchDriveFolders}
                                disabled={loadingDriveFolders}
                                className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline"
                              >
                                <RefreshCw className={`w-3 h-3 ${loadingDriveFolders ? "animate-spin" : ""}`} />
                                <span>רענן תיקיות</span>
                              </button>
                            </div>

                            {driveFoldersList.length > 0 ? (
                              <select
                                value={parentFolderId}
                                onChange={(e) => setParentFolderId(e.target.value)}
                                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">-- בחר תיקייה מתוך הדרייב --</option>
                                {driveFoldersList.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {f.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <p className="text-[11px] text-slate-500">
                                {loadingDriveFolders
                                  ? "טוען תיקיות מ-Google Drive..."
                                  : "לא נמצאו תיקיות או שטרם נטענו. ניתן להדביק קישור למטה:"}
                              </p>
                            )}

                            <input
                              type="text"
                              dir="ltr"
                              value={parentFolderId}
                              onChange={(e) => setParentFolderId(e.target.value)}
                              placeholder="או הדבק מזהה/קישור: https://drive.google.com/drive/folders/..."
                              className="w-full text-xs font-mono p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        )}
                      </div>

                      {/* SHEET PLACEMENT */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          <span>היכן לפתוח את גיליון ה-Sheets?</span>
                        </label>
                        <div className="space-y-1.5">
                          <label className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition text-xs hover:bg-slate-50 border-slate-200">
                            <input
                              type="radio"
                              name="sheetPlacement"
                              checked={sheetPlacement === "inside_folder"}
                              onChange={() => setSheetPlacement("inside_folder")}
                              className="text-blue-600"
                            />
                            <div className="flex-1">
                              <span className="font-semibold text-slate-800">בתוך התיקייה הראשית שנוצרת (מומלץ)</span>
                              <p className="text-[11px] text-slate-500">הגיליון יישמר יחד עם תיקיות המועמדים במקום מסודר אחד</p>
                            </div>
                          </label>

                          <label className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition text-xs hover:bg-slate-50 border-slate-200">
                            <input
                              type="radio"
                              name="sheetPlacement"
                              checked={sheetPlacement === "same_level"}
                              onChange={() => setSheetPlacement("same_level")}
                              className="text-blue-600"
                            />
                            <div className="flex-1">
                              <span className="font-semibold text-slate-800">לצד התיקייה הראשית (באותה רמת תיקייה)</span>
                              <p className="text-[11px] text-slate-500">הגיליון והתיקייה הראשית ייווצרו כשני פריטים מקבילים</p>
                            </div>
                          </label>
                        </div>

                        {/* ADVANCED NAME CUSTOMIZATION TOGGLE */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setShowLocationSettings(!showLocationSettings)}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <span>התאמת שמות התיקייה והגיליון (אופציונלי)</span>
                            {showLocationSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* CUSTOM NAMES SECTION (COLLAPSIBLE) */}
                    {showLocationSettings && (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700">שם התיקייה הראשית:</label>
                          <input
                            type="text"
                            value={customFolderName}
                            onChange={(e) => setCustomFolderName(e.target.value)}
                            className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-700">שם גיליון הנתונים:</label>
                          <input
                            type="text"
                            value={customSheetName}
                            onChange={(e) => setCustomSheetName(e.target.value)}
                            className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                          />
                        </div>
                      </div>
                    )}

                    {/* SHARE EMAIL AND SUBMIT BUTTON */}
                    <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs font-bold text-slate-700">
                          כתובת אימייל לשיתוף (הזן את המייל שלך לקבלת הרשאות עריכה):
                        </label>
                        <input
                          type="email"
                          dir="ltr"
                          value={autoCreateShareEmail}
                          onChange={(e) => setAutoCreateShareEmail(e.target.value)}
                          placeholder="your-name@gmail.com"
                          className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-[11px] text-slate-500">
                          התיקייה והגיליון ישותפו עם כתובת זו כ-עורך (Editor) כך שתוכל לצפות ולערוך אותם בנוחות.
                        </p>
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={handleAutoCreateResources}
                          disabled={autoCreateLoading}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg transition shadow-md disabled:opacity-50"
                        >
                          {autoCreateLoading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>מקים תיקייה ומסד נתונים ב-Google...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 text-amber-300" />
                              <span>צור גיליון ותיקייה אוטומטית עכשיו</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ACTIVE RESOURCES DISPLAY */}
                  {(googleSpreadsheetUrl || googleDriveFolderUrl) && (
                    <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <span className="font-bold text-emerald-950 text-sm">
                            משאבי ה-Google מחוברים ופעילים במערכת!
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200 self-start sm:self-auto">
                          מסד נתונים ותיקייה פעילים
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        {googleSpreadsheetUrl && (
                          <a
                            href={googleSpreadsheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2.5 bg-white border border-emerald-200 rounded-lg hover:bg-emerald-50/50 transition text-emerald-900 group shadow-xs"
                          >
                            <span className="flex items-center gap-2 font-bold">
                              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                              <span>גיליון נתונים (Sheets)</span>
                            </span>
                            <ExternalLink className="w-3.5 h-3.5 text-emerald-600 group-hover:translate-x-0.5 transition" />
                          </a>
                        )}
                        {googleDriveFolderUrl && (
                          <a
                            href={googleDriveFolderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2.5 bg-white border border-blue-200 rounded-lg hover:bg-blue-50/50 transition text-blue-900 group shadow-xs"
                          >
                            <span className="flex items-center gap-2 font-bold">
                              <HardDrive className="w-4 h-4 text-blue-600" />
                              <span>תיקייה ראשית (Drive)</span>
                            </span>
                            <ExternalLink className="w-3.5 h-3.5 text-blue-600 group-hover:translate-x-0.5 transition" />
                          </a>
                        )}
                      </div>

                      <div className="pt-2 border-t border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <span className="text-slate-600 text-[11px]">
                          לשמירת הגדרות אלו לצמיתות ב-Vercel (גם לאחר פריסות עתידיות):
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const snippet = `GOOGLE_SPREADSHEET_ID=${googleSpreadsheetId}\nGOOGLE_DRIVE_ROOT_FOLDER_ID=${googleDriveFolderId}`;
                            navigator.clipboard.writeText(snippet);
                            setMessage({
                              type: "success",
                              text: "משתני הסביבה הועתקו ללוח! ניתן להדביקם ב-Settings > Environment Variables ב-Vercel.",
                            });
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-100/50 border border-emerald-300 rounded-lg text-emerald-800 font-bold transition text-xs shadow-xs self-start sm:self-auto"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>העתק משתני סביבה ל-Vercel</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* CARD 3: MANUAL IDENTIFIERS FORM */}
                <form
                  onSubmit={handleSaveGoogleConnection}
                  className="p-4 bg-white rounded-xl border border-slate-200 space-y-4 shadow-xs"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-400 text-white flex items-center justify-center text-xs font-bold">
                        3
                      </span>
                      <h3 className="text-sm font-bold text-slate-800">
                        הגדרת מזהים ידנית (אופציונלי למשתמשים קיימים)
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      למי שכבר יצר גיליון או תיקייה ידנית
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* SPREADSHEET ID FIELD */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Google Spreadsheet ID או קישור:</span>
                        </label>
                        {googleSpreadsheetUrl && (
                          <a
                            href={googleSpreadsheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                          >
                            <span>פתח גיליון</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <input
                        type="text"
                        dir="ltr"
                        value={googleSpreadsheetId}
                        onChange={(e) => setGoogleSpreadsheetId(e.target.value)}
                        placeholder="הדבק מזהה או קישור: https://docs.google.com/spreadsheets/d/.../edit"
                        className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-[11px] text-slate-500">
                        ניתן להדביק את המזהה ישירות או את הקישור המלא משורת הכתובת בדפדפן.
                      </p>
                    </div>

                    {/* DRIVE FOLDER ID FIELD */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                          <span>Google Drive Root Folder ID או קישור:</span>
                        </label>
                        {googleDriveFolderUrl && (
                          <a
                            href={googleDriveFolderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                          >
                            <span>פתח תיקייה בדרייב</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <input
                        type="text"
                        dir="ltr"
                        value={googleDriveFolderId}
                        onChange={(e) => setGoogleDriveFolderId(e.target.value)}
                        placeholder="הדבק מזהה או קישור: https://drive.google.com/drive/folders/..."
                        className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-[11px] text-slate-500">
                        המערכת תייצר תחת תיקייה זו תיקיות ייעודיות לכל מועמד עבור העלאת מסמכים חתומים.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleTestGoogleConnection()}
                      disabled={testLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{testLoading ? "בודק..." : "בדוק נתונים אלו"}</span>
                    </button>
                    <button
                      type="submit"
                      disabled={savingGoogle}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingGoogle ? "שומר ומאמת..." : "שמור שינויים והחל"}</span>
                    </button>
                  </div>
                </form>

                {/* CARD 4: MANUAL INSTRUCTIONS FOR REFERENCE */}
                <div className="p-5 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl border border-slate-200 space-y-4">
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-slate-400 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      4
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">
                        הוראות שיתוף ידניות (עבור חשבון שירות Service Account)
                      </h3>
                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2 font-medium">
                        חשוב מאוד להעניק ל-Service Account הרשאות עריכה כדי שהמערכת תפעל:
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {/* SPREADSHEET STEPS */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <h4 className="text-xs font-bold text-slate-800">Google Spreadsheet:</h4>
                      </div>
                      <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600">
                        <li className="leading-relaxed">פתח את הגיליון ב-Google Sheets.</li>
                        <li className="leading-relaxed">
                          לחץ על שתף (Share) בפינה העליונה.
                        </li>
                        <li className="leading-relaxed">
                          הדבק את כתובת האימייל של ה-Service Account (הערך של client_email שמופיע בסעיף 1 לעיל).
                        </li>
                        <li className="leading-relaxed">
                          הגדר הרשאת עורך (Editor) והסר את הסימון מ-Notify people.
                        </li>
                        <li className="leading-relaxed">
                          העתק את ה-Spreadsheet ID משורת הכתובת בדפדפן:
                          <div className="mt-1 p-1.5 bg-slate-50 rounded border border-slate-200 font-mono text-[10px] text-slate-700 break-all" dir="ltr">
                            https://docs.google.com/spreadsheets/d/&lt;SPREADSHEET_ID&gt;/edit
                          </div>
                        </li>
                      </ol>
                    </div>

                    {/* DRIVE FOLDER STEPS */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <HardDrive className="w-4 h-4 text-blue-600" />
                        <h4 className="text-xs font-bold text-slate-800">Google Drive Root Folder:</h4>
                      </div>
                      <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600">
                        <li className="leading-relaxed">
                          פתח את Google Drive וצור תיקייה ראשית (לדוגמה: Onboarding_System_Root).
                        </li>
                        <li className="leading-relaxed">
                          לחץ קליק ימני על התיקייה -&gt; שיתוף (Share).
                        </li>
                        <li className="leading-relaxed">
                          הוסף את ה-Service Account כ-עורך (Editor) והסר את הסימון מ-Notify people.
                        </li>
                        <li className="leading-relaxed">
                          העתק את ה-Folder ID משורת הכתובת:
                          <div className="mt-1 p-1.5 bg-slate-50 rounded border border-slate-200 font-mono text-[10px] text-slate-700 break-all" dir="ltr">
                            https://drive.google.com/drive/folders/&lt;FOLDER_ID&gt;
                          </div>
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
