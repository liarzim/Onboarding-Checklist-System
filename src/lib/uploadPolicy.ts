import fs from "fs";
import path from "path";
import os from "os";
import {
  DEFAULT_UPLOAD_POLICY,
  normalizeExtension,
  type UploadPolicyConfig,
} from "./uploadPolicyTypes";

export * from "./uploadPolicyTypes";

declare global {
  // eslint-disable-next-line no-var
  var __uploadPolicyCache: UploadPolicyConfig | undefined;
}

const PRIMARY_POLICY_PATH = path.join(process.cwd(), "data", "upload-policy.json");
const FALLBACK_POLICY_PATH = path.join(os.tmpdir(), "upload-policy.json");

function ensureDirectoryExists(filePath: string) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {
    // Ignore directory creation errors in serverless
  }
}

export function getUploadPolicy(): UploadPolicyConfig {
  if (global.__uploadPolicyCache) {
    return global.__uploadPolicyCache;
  }

  // 1. Try reading from primary data folder
  try {
    if (fs.existsSync(PRIMARY_POLICY_PATH)) {
      const content = fs.readFileSync(PRIMARY_POLICY_PATH, "utf-8");
      const parsed = JSON.parse(content);
      const policy: UploadPolicyConfig = {
        ...DEFAULT_UPLOAD_POLICY,
        ...parsed,
        passport_photo: {
          ...DEFAULT_UPLOAD_POLICY.passport_photo,
          ...(parsed.passport_photo || {}),
        },
        id_card: {
          ...DEFAULT_UPLOAD_POLICY.id_card,
          ...(parsed.id_card || {}),
        },
      };
      global.__uploadPolicyCache = policy;
      return policy;
    }
  } catch (err) {
    console.warn("Could not read primary upload policy:", err);
  }

  // 2. Try reading from fallback path
  try {
    if (fs.existsSync(FALLBACK_POLICY_PATH)) {
      const content = fs.readFileSync(FALLBACK_POLICY_PATH, "utf-8");
      const parsed = JSON.parse(content);
      const policy: UploadPolicyConfig = {
        ...DEFAULT_UPLOAD_POLICY,
        ...parsed,
        passport_photo: {
          ...DEFAULT_UPLOAD_POLICY.passport_photo,
          ...(parsed.passport_photo || {}),
        },
        id_card: {
          ...DEFAULT_UPLOAD_POLICY.id_card,
          ...(parsed.id_card || {}),
        },
      };
      global.__uploadPolicyCache = policy;
      return policy;
    }
  } catch (err) {
    console.warn("Could not read fallback upload policy:", err);
  }

  global.__uploadPolicyCache = DEFAULT_UPLOAD_POLICY;
  return DEFAULT_UPLOAD_POLICY;
}

export function saveUploadPolicy(policy: Partial<UploadPolicyConfig>): UploadPolicyConfig {
  const current = getUploadPolicy();
  const merged: UploadPolicyConfig = {
    passport_photo: {
      allowed_extensions: (policy.passport_photo?.allowed_extensions || current.passport_photo.allowed_extensions)
        .map(normalizeExtension)
        .filter(Boolean),
      max_size_mb: Number(policy.passport_photo?.max_size_mb || current.passport_photo.max_size_mb),
    },
    id_card: {
      allowed_extensions: (policy.id_card?.allowed_extensions || current.id_card.allowed_extensions)
        .map(normalizeExtension)
        .filter(Boolean),
      max_files: Number(policy.id_card?.max_files || current.id_card.max_files),
      max_size_mb: Number(policy.id_card?.max_size_mb || current.id_card.max_size_mb),
    },
    updated_at: new Date().toISOString(),
  };

  global.__uploadPolicyCache = merged;

  const jsonStr = JSON.stringify(merged, null, 2);

  let saved = false;
  try {
    ensureDirectoryExists(PRIMARY_POLICY_PATH);
    fs.writeFileSync(PRIMARY_POLICY_PATH, jsonStr, "utf-8");
    saved = true;
  } catch (err) {
    console.warn("Could not write primary upload policy:", err);
  }

  if (!saved) {
    try {
      ensureDirectoryExists(FALLBACK_POLICY_PATH);
      fs.writeFileSync(FALLBACK_POLICY_PATH, jsonStr, "utf-8");
    } catch (err) {
      console.warn("Could not write fallback upload policy:", err);
    }
  }

  return merged;
}
