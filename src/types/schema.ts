import { z } from "zod";

export const CandidateSchema = z.object({
  candidate_id: z.string().min(1),
  full_name: z.string().min(1),
  id_number: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  vendor_id: z.string().min(1),
  project_id: z.string().min(1),
  drive_folder_id: z.string().min(1),
  current_stage_id: z.string().min(1),
  is_completed: z.boolean().default(false),
  access_token: z.string().nullable().optional(),
  token_expires_at: z.string().nullable().optional(),
  is_signed_by_candidate: z.boolean().default(false).optional(),
  signature_url: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  candidate_details: z.record(z.any()).or(z.string()).nullable().optional(),
});

export type Candidate = z.infer<typeof CandidateSchema>;

export interface CandidateFieldMapping {
  key: string;
  label: string;
  sourceForms: string[];
}

export const CANDIDATE_EXTENDED_COLUMNS: CandidateFieldMapping[] = [
  { key: "first_name", label: "שם פרטי (first_name)", sourceForms: ["doc_1"] },
  { key: "last_name", label: "שם משפחה (last_name)", sourceForms: ["doc_1"] },
  { key: "name_en", label: "שם באנגלית (name_en)", sourceForms: ["doc_1", "doc_9"] },
  { key: "father_name", label: "שם האב (father_name)", sourceForms: ["doc_1", "doc_4"] },
  { key: "prev_last_name", label: "שם משפחה קודם (prev_last_name)", sourceForms: ["doc_1"] },
  { key: "birth_date", label: "תאריך לידה (birth_date)", sourceForms: ["doc_1"] },
  { key: "birth_country", label: "ארץ לידה (birth_country)", sourceForms: ["doc_1"] },
  { key: "aliyah_year", label: "שנת עלייה (aliyah_year)", sourceForms: ["doc_1"] },
  { key: "marital_status", label: "מצב משפחתי (marital_status)", sourceForms: ["doc_1"] },
  { key: "gender", label: "מין (gender)", sourceForms: ["doc_1"] },
  { key: "religion", label: "דת (religion)", sourceForms: ["doc_1"] },
  { key: "other_citizenship", label: "אזרחות נוספת (other_citizenship)", sourceForms: ["doc_1"] },
  { key: "address", label: "כתובת מגורים מלאה (address)", sourceForms: ["doc_1", "doc_4"] },
  { key: "city", label: "ישוב / עיר (city)", sourceForms: ["doc_1"] },
  { key: "street", label: "רחוב (street)", sourceForms: ["doc_1"] },
  { key: "house_number", label: "מספר בית (house_number)", sourceForms: ["doc_1"] },
  { key: "zip_code", label: "מיקוד (zip_code)", sourceForms: ["doc_1"] },
  { key: "home_phone", label: "טלפון בבית (home_phone)", sourceForms: ["doc_1"] },
  { key: "army_service", label: "שירות צבאי / לאומי (army_service)", sourceForms: ["doc_1"] },
  { key: "military_id", label: "מספר אישי / צבאי (military_id)", sourceForms: ["doc_1"] },
  { key: "military_role", label: "תפקיד בשירות (military_role)", sourceForms: ["doc_1"] },
  { key: "military_years", label: "שנות שירות (military_years)", sourceForms: ["doc_1"] },
  { key: "exemption_reason", label: "סיבת פטור (exemption_reason)", sourceForms: ["doc_1"] },
  { key: "education_high", label: "השכלה תיכונית (education_high)", sourceForms: ["doc_1"] },
  { key: "education_academic", label: "השכלה אקדמית (education_academic)", sourceForms: ["doc_1"] },
  { key: "workplace1", label: "מקום עבודה 1 (workplace1)", sourceForms: ["doc_1"] },
  { key: "workplace2", label: "מקום עבודה 2 (workplace2)", sourceForms: ["doc_1"] },
  { key: "ref1", label: "ממליץ 1 (ref1)", sourceForms: ["doc_1"] },
  { key: "ref2", label: "ממליץ 2 (ref2)", sourceForms: ["doc_1"] },
  { key: "role_in_project", label: "תפקיד בפרויקט (role_in_project)", sourceForms: ["doc_9"] },
  { key: "manager_name", label: "מנהל ישיר (manager_name)", sourceForms: ["doc_9"] },
  { key: "start_date", label: "תאריך תחילת עבודה (start_date)", sourceForms: ["doc_9"] },
  { key: "previous_gov", label: "עבר בשירות המדינה (previous_gov)", sourceForms: ["doc_9"] },
  { key: "previous_dates", label: "תקופת שירות קודמת (previous_dates)", sourceForms: ["doc_9"] },
  { key: "candidate_details", label: "גיבוי נתונים מרוכז (candidate_details_json)", sourceForms: ["all"] },
];

export const ChecklistItemStatusSchema = z.enum([
  "missing",
  "uploaded",
  "approved",
  "rejected",
]);

export type ChecklistItemStatus = z.infer<typeof ChecklistItemStatusSchema>;

export const ChecklistItemSchema = z.object({
  checklist_item_id: z.string().min(1),
  candidate_id: z.string().min(1),
  doc_type_id: z.string().min(1),
  status: ChecklistItemStatusSchema.or(z.string()),
  file_name: z.string().nullable().optional(),
  file_drive_id: z.string().nullable().optional(),
  file_drive_url: z.string().nullable().optional(),
  form_data: z.string().nullable().optional(),
  updated_at: z.string(),
});

export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

export const DocumentTypeSchema = z.object({
  doc_type_id: z.string().min(1),
  doc_name: z.string().min(1),
  is_required: z.boolean().default(true),
  template_drive_url: z.string().nullable().optional(),
  order_index: z.number().int().nonnegative(),
});

export type DocumentType = z.infer<typeof DocumentTypeSchema>;

export const VendorSchema = z.object({
  vendor_id: z.string().min(1),
  company_name: z.string().min(1),
  contact_name: z.string().min(1),
  contact_email: z.string().email(),
  is_active: z.boolean().default(true),
});

export type Vendor = z.infer<typeof VendorSchema>;

export const SettingStageSchema = z.object({
  stage_id: z.string().min(1),
  stage_name: z.string().min(1),
  stage_order: z.number().int().nonnegative(),
  is_terminal: z.boolean().default(false),
});

export type SettingStage = z.infer<typeof SettingStageSchema>;

export const AuditLogEntrySchema = z.object({
  log_id: z.string().min(1),
  timestamp: z.string(),
  actor_email: z.string().email().or(z.literal("system")),
  actor_role: z.string().min(1),
  action_type: z.string().min(1),
  entity_type: z.string().min(1),
  entity_id: z.string().min(1),
  details: z.string(),
});

export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;

export const AdminUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  role: z.enum(["Admin", "HR"]).default("Admin"),
  password_hash: z.string().optional().default(""),
  must_change_password: z.boolean().optional().default(false),
  auth_provider: z.enum(["local", "google", "both"]).optional().default("both"),
  added_at: z.string().optional(),
});

export type AdminUser = z.infer<typeof AdminUserSchema>;
