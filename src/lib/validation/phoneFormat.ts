/**
 * Formats any Israeli phone number to uniform ###-####### format (e.g. 050-1234567).
 * Always preserves or restores the leading 0 if omitted.
 */
export function formatIsraeliPhone(rawPhone: string | null | undefined): string {
  if (!rawPhone) return "";

  // Clean all non-digit characters
  let digits = rawPhone.replace(/\D/g, "");

  // If starts with 972 (international prefix), strip it
  if (digits.startsWith("972")) {
    digits = digits.slice(3);
  }

  // Always ensure leading 0
  if (digits.length > 0 && !digits.startsWith("0")) {
    digits = "0" + digits;
  }

  // Mobile / 10-digit format: 05X-XXXXXXX (3 digits - 7 digits)
  if (digits.length >= 10) {
    const main10 = digits.slice(0, 10);
    return `${main10.slice(0, 3)}-${main10.slice(3)}`;
  }

  // Landline / 9-digit format: 0X-XXXXXXX or 0XX-XXXXXX
  if (digits.length === 9) {
    if (
      digits.startsWith("02") ||
      digits.startsWith("03") ||
      digits.startsWith("04") ||
      digits.startsWith("08") ||
      digits.startsWith("09")
    ) {
      return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    }
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  // Generic fallback: if 4+ digits, format prefix and remainder
  if (digits.length > 3) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return digits;
}
