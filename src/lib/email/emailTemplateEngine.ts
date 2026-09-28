import type { StatusEmailTemplate } from "@/types/emailTemplates";

export interface CandidateEmailVariables {
  candidate_name: string;
  id_number: string;
  project_name: string;
  vendor_name: string;
  completion_date?: string;
  forms_count?: number;
  drive_url?: string;
  forms_list?: string;
}

export const DEFAULT_FORMS_LIST_STR = `1. שאלון אישי רמה 5
2. עלון מידע לנבדק
3. הצהרה על קבלת כרטיס חכם
4. הסכמה למסירת מידע פלילי
5. התחייבות לשמירת סודיות
6. התחייבות לשמירת פרטיות
7. הימנעות מעבירות מחשב
8. הסכמה לניטור סייבר
9. בקשה להנפקת כרטיס חכם
10. צילום תעודת זהות וספח
11. תמונת פספורט רשמית`;

/**
 * Replaces placeholders in subject and body text with actual candidate values.
 * Supports both Hebrew and English placeholder aliases.
 */
export function interpolateEmailTemplate(
  templateText: string,
  vars: CandidateEmailVariables
): string {
  if (!templateText) return "";

  const now = new Date();
  const defaultDateStr = vars.completion_date || `${now.toLocaleDateString("he-IL")} ${now.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`;
  const countStr = String(vars.forms_count ?? 11);
  const formsListStr = vars.forms_list || DEFAULT_FORMS_LIST_STR;

  const replacements: Record<string, string> = {
    // Hebrew placeholders
    "{שם_מועמד}": vars.candidate_name || "",
    "{שם_המועמד}": vars.candidate_name || "",
    "{תעודת_זהות}": vars.id_number || "",
    "{ת.ז}": vars.id_number || "",
    "{מספר_זהות}": vars.id_number || "",
    "{שם_פרויקט}": vars.project_name || "",
    "{פרויקט}": vars.project_name || "",
    "{שם_ספק}": vars.vendor_name || "",
    "{ספק}": vars.vendor_name || "",
    "{תאריך_סיום}": defaultDateStr,
    "{תאריך}": defaultDateStr,
    "{מספר_טפסים}": countStr,
    "{קישור_דרייב}": vars.drive_url || "",
    "{קישור_תיקייה}": vars.drive_url || "",
    "{רשימת_טפסים}": formsListStr,
    "{רשימת_הטפסים}": formsListStr,
    "{רשימת_מסמכים}": formsListStr,

    // English placeholders
    "{candidate_name}": vars.candidate_name || "",
    "{id_number}": vars.id_number || "",
    "{project_name}": vars.project_name || "",
    "{vendor_name}": vars.vendor_name || "",
    "{completion_date}": defaultDateStr,
    "{forms_count}": countStr,
    "{drive_url}": vars.drive_url || "",
    "{forms_list}": formsListStr,
  };

  let result = templateText;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.split(key).join(value);
  }

  return result;
}

/**
 * Creates an RFC 6068 compliant mailto URL with encoded recipient, subject, and body.
 */
export function createMailtoLink(
  recipient: string,
  subject: string,
  body: string
): string {
  const encRecipient = encodeURIComponent(recipient.trim());
  const encSubject = encodeURIComponent(subject.trim());
  const encBody = encodeURIComponent(body.trim());

  return `mailto:${encRecipient}?subject=${encSubject}&body=${encBody}`;
}
