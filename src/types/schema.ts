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
});

export type Candidate = z.infer<typeof CandidateSchema>;

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
