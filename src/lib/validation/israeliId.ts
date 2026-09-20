/**
 * Israeli ID Number (Teudat Zehut) Luhn Checksum Validator.
 * Standard Israeli ID consists of up to 9 digits with a Luhn checksum digit.
 */

export interface IsraeliIdValidationResult {
  isValid: boolean;
  paddedId: string;
  error?: string;
}

/**
 * Validates Israeli ID using the official Luhn algorithm.
 * Automatically pads with leading zeros up to 9 digits.
 */
export function validateIsraeliId(idInput: string): IsraeliIdValidationResult {
  if (!idInput) {
    return {
      isValid: false,
      paddedId: "",
      error: "נא להזין מספר תעודת זהות",
    };
  }

  // Remove spaces and hyphens
  const cleanId = idInput.replace(/[\s-]/g, "").trim();

  // Must contain only digits
  if (!/^\d+$/.test(cleanId)) {
    return {
      isValid: false,
      paddedId: cleanId,
      error: "תעודת זהות חייבת להכיל ספרות בלבד",
    };
  }

  // Must be between 1 and 9 digits
  if (cleanId.length > 9) {
    return {
      isValid: false,
      paddedId: cleanId,
      error: "תעודת זהות אינה יכולה להכיל יותר מ-9 ספרות",
    };
  }

  // Pad to 9 digits with leading zeros
  const paddedId = cleanId.padStart(9, "0");

  // All zeros is invalid
  if (paddedId === "000000000") {
    return {
      isValid: false,
      paddedId,
      error: "מספר תעודת זהות אינו תקין",
    };
  }

  // Calculate Luhn checksum for Israeli ID
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const digit = Number(paddedId[i]);
    let step = digit * ((i % 2) + 1);
    if (step > 9) {
      step -= 9;
    }
    sum += step;
  }

  if (sum % 10 !== 0) {
    return {
      isValid: false,
      paddedId,
      error: "ספרת ביקורת שגויה בתעודת הזהות",
    };
  }

  return {
    isValid: true,
    paddedId,
  };
}

/**
 * Quick boolean check for Israeli ID validity.
 */
export function isValidIsraeliId(idInput: string): boolean {
  return validateIsraeliId(idInput).isValid;
}
