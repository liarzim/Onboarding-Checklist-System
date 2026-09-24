/**
 * Validates an Israeli ID number (Teudat Zehut) using the official Luhn-based check-digit algorithm.
 * An Israeli ID number contains up to 9 digits (padded with leading zeros if shorter).
 */
export function validateIsraeliId(rawId: string | number): boolean {
  if (!rawId) return false;
  const str = String(rawId).trim();

  // Must be digits only and between 5 and 9 characters
  if (!/^\d{5,9}$/.test(str)) {
    return false;
  }

  // Pad with leading zeros up to 9 digits
  const padded = str.padStart(9, "0");

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const digit = Number(padded.charAt(i));
    const step = digit * ((i % 2) + 1);
    sum += step > 9 ? step - 9 : step;
  }

  return sum % 10 === 0;
}
