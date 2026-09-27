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

export interface FormFieldSetting {
  doc_type_id: string;
  field_key: string;
  field_label: string;
  section: string;
  is_required: boolean;
}

export const DEFAULT_FORM_FIELD_SETTINGS: FormFieldSetting[] = [
  // doc_1 fields
  { doc_type_id: "doc_1", field_key: "first_name", field_label: "שם פרטי", section: "פרטים אישיים", is_required: true },
  { doc_type_id: "doc_1", field_key: "last_name", field_label: "שם משפחה", section: "פרטים אישיים", is_required: true },
  { doc_type_id: "doc_1", field_key: "name_en", field_label: "שם באנגלית", section: "פרטים אישיים", is_required: false },
  { doc_type_id: "doc_1", field_key: "father_name", field_label: "שם האב", section: "פרטים אישיים", is_required: false },
  { doc_type_id: "doc_1", field_key: "prev_last_name", field_label: "שם משפחה קודם", section: "פרטים אישיים", is_required: false },
  { doc_type_id: "doc_1", field_key: "birth_date", field_label: "תאריך לידה", section: "פרטים אישיים", is_required: true },
  { doc_type_id: "doc_1", field_key: "birth_country", field_label: "ארץ לידה", section: "פרטים אישיים", is_required: false },
  { doc_type_id: "doc_1", field_key: "aliyah_year", field_label: "שנת עלייה", section: "פרטים אישיים", is_required: false },
  { doc_type_id: "doc_1", field_key: "marital_status", field_label: "מצב משפחתי", section: "פרטים אישיים", is_required: false },
  { doc_type_id: "doc_1", field_key: "gender", field_label: "מין", section: "פרטים אישיים", is_required: false },
  { doc_type_id: "doc_1", field_key: "religion", field_label: "דת", section: "פרטים אישיים", is_required: false },
  { doc_type_id: "doc_1", field_key: "other_citizenship", field_label: "אזרחות נוספת", section: "פרטים אישיים", is_required: false },
  { doc_type_id: "doc_1", field_key: "city", field_label: "ישוב / עיר", section: "כתובת והתקשרות", is_required: true },
  { doc_type_id: "doc_1", field_key: "street", field_label: "שם רחוב", section: "כתובת והתקשרות", is_required: true },
  { doc_type_id: "doc_1", field_key: "house_number", field_label: "מספר בית", section: "כתובת והתקשרות", is_required: true },
  { doc_type_id: "doc_1", field_key: "zip_code", field_label: "מיקוד", section: "כתובת והתקשרות", is_required: false },
  { doc_type_id: "doc_1", field_key: "mobile_phone", field_label: "טלפון נייד", section: "כתובת והתקשרות", is_required: true },
  { doc_type_id: "doc_1", field_key: "home_phone", field_label: "טלפון בבית", section: "כתובת והתקשרות", is_required: false },
  { doc_type_id: "doc_1", field_key: "army_service", field_label: "סוג שירות צבאי / לאומי", section: "שירות צבאי / לאומי", is_required: false },
  { doc_type_id: "doc_1", field_key: "military_id", field_label: "מספר אישי / צבאי", section: "שירות צבאי / לאומי", is_required: false },
  { doc_type_id: "doc_1", field_key: "military_role", field_label: "תפקיד בשירות", section: "שירות צבאי / לאומי", is_required: false },
  { doc_type_id: "doc_1", field_key: "military_years", field_label: "שנות שירות", section: "שירות צבאי / לאומי", is_required: false },
  { doc_type_id: "doc_1", field_key: "exemption_reason", field_label: "סיבת פטור", section: "שירות צבאי / לאומי", is_required: false },
  { doc_type_id: "doc_1", field_key: "education_high", field_label: "השכלה תיכונית", section: "השכלה ותעסוקה", is_required: false },
  { doc_type_id: "doc_1", field_key: "education_academic", field_label: "השכלה אקדמית", section: "השכלה ותעסוקה", is_required: false },
  { doc_type_id: "doc_1", field_key: "workplace1", field_label: "מקום עבודה אחרון", section: "השכלה ותעסוקה", is_required: false },
  { doc_type_id: "doc_1", field_key: "workplace2", field_label: "מקום עבודה קודם", section: "השכלה ותעסוקה", is_required: false },
  { doc_type_id: "doc_1", field_key: "ref1", field_label: "ממליץ 1", section: "השכלה ותעסוקה", is_required: false },
  { doc_type_id: "doc_1", field_key: "ref2", field_label: "ממליץ 2", section: "השכלה ותעסוקה", is_required: false },

  // doc_4 fields
  { doc_type_id: "doc_4", field_key: "father_name", field_label: "שם האב", section: "פרטי מועמד", is_required: true },
  { doc_type_id: "doc_4", field_key: "address", field_label: "כתובת מגורים מלאה", section: "פרטי מועמד", is_required: true },

  // doc_9 fields
  { doc_type_id: "doc_9", field_key: "name_en", field_label: "שם באנגלית (עבור הכרטיס)", section: "פרטי כרטיס עובד", is_required: false },
  { doc_type_id: "doc_9", field_key: "role_in_project", field_label: "תפקיד מיועד בפרויקט", section: "פרטי כרטיס עובד", is_required: true },
  { doc_type_id: "doc_9", field_key: "manager_name", field_label: "שם מנהל ישיר", section: "פרטי כרטיס עובד", is_required: false },
  { doc_type_id: "doc_9", field_key: "start_date", field_label: "תאריך תחילת עבודה", section: "פרטי כרטיס עובד", is_required: false },
  { doc_type_id: "doc_9", field_key: "previous_gov", field_label: "עבר בשירות המדינה", section: "פרטי כרטיס עובד", is_required: false },
  { doc_type_id: "doc_9", field_key: "previous_dates", field_label: "תקופת שירות קודם במדינה", section: "פרטי כרטיס עובד", is_required: false },
];

export const DEFAULT_DROPDOWN_OPTIONS: Record<string, { label: string; options: string[] }> = {
  marital_status: {
    label: "מצב משפחתי",
    options: ["רווק/ה", "נשוי/אה", "גרוש/ה", "אלמן/ה", "פרוד/ה", "ידוע/ה בציבור"],
  },
  gender: {
    label: "מין",
    options: ["זכר", "נקבה", "אחר"],
  },
  religion: {
    label: "דת",
    options: [
      "יהודי/ת",
      "מוסלמי/ת",
      "נוצרי/ת",
      "דרוזי/ת",
      "צ'רקסי/ת",
      "ללא סיווג דת",
      "אחר",
    ],
  },
  army_service: {
    label: "סוג שירות צבאי / לאומי",
    options: [
      'שירות מלא בצה"ל',
      'שירות חלקי בצה"ל',
      "שירות לאומי / אזרחי",
      "פטור משירות צבאי",
      "אינו מחויב בגיוס",
    ],
  },
  education_high: {
    label: "השכלה תיכונית",
    options: [
      "תעודת בגרות מלאה",
      "12 שנות לימוד ללא בגרות",
      "תעודת בגרות חלקית",
      "תעודה מקצועית / טכנולוגית",
      'לימודים בחו"ל',
    ],
  },
  education_academic: {
    label: "השכלה אקדמית",
    options: [
      "ללא השכלה אקדמית",
      "סטודנט/ית לתואר ראשון",
      "תואר ראשון (B.A / B.Sc)",
      "תואר שני (M.A / M.Sc / MBA)",
      "תואר שלישי (Ph.D)",
      "הנדסאי / לימודי תעודה",
    ],
  },
  previous_gov: {
    label: "העסקה קודמת במשרד ממשלתי",
    options: ["לא", "כן"],
  },
  birth_country: {
    label: "ארץ לידה",
    options: [
      "ישראל",
      "ארצות הברית",
      "רוסיה",
      "אוקראינה",
      "צרפת",
      "בריטניה",
      "ארגנטינה",
      "אתיופיה",
      "קנדה",
      "אחר",
    ],
  },
};

