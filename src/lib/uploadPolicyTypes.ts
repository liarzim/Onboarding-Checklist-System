export interface UploadPolicyConfig {
  passport_photo: {
    allowed_extensions: string[];
    max_size_mb: number;
  };
  id_card: {
    allowed_extensions: string[];
    max_files: number;
    max_size_mb: number;
  };
  updated_at?: string;
}

export const DEFAULT_UPLOAD_POLICY: UploadPolicyConfig = {
  passport_photo: {
    allowed_extensions: [".jpg", ".jpeg", ".png", ".webp"],
    max_size_mb: 5,
  },
  id_card: {
    allowed_extensions: [".jpg", ".jpeg", ".png", ".webp", ".pdf"],
    max_files: 5,
    max_size_mb: 10,
  },
};

export function normalizeExtension(ext: string): string {
  let cleaned = ext.trim().toLowerCase();
  if (!cleaned.startsWith(".")) {
    cleaned = `.${cleaned}`;
  }
  return cleaned;
}

export function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return "";
  return fileName.slice(lastDot).toLowerCase().trim();
}

export function isPassportPhotoExtensionAllowed(
  fileName: string,
  policy: UploadPolicyConfig = DEFAULT_UPLOAD_POLICY
): { allowed: boolean; ext: string; allowedExtensions: string[] } {
  const ext = getFileExtension(fileName);
  const allowedExtensions = policy.passport_photo.allowed_extensions.map(normalizeExtension);
  const allowed = allowedExtensions.includes(ext);

  return {
    allowed,
    ext,
    allowedExtensions,
  };
}

export function isIdCardExtensionAllowed(
  fileName: string,
  policy: UploadPolicyConfig = DEFAULT_UPLOAD_POLICY
): { allowed: boolean; ext: string; allowedExtensions: string[] } {
  const ext = getFileExtension(fileName);
  const allowedExtensions = policy.id_card.allowed_extensions.map(normalizeExtension);
  const allowed = allowedExtensions.includes(ext);

  return {
    allowed,
    ext,
    allowedExtensions,
  };
}
