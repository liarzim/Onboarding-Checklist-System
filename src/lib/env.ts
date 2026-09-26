import { z } from "zod";
import {
  getDynamicGoogleConfig,
  extractSpreadsheetId,
  extractDriveFolderId,
} from "./dynamicConfig";

export const envSchema = z.object({
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z
    .string()
    .optional()
    .default("service-account@project.iam.gserviceaccount.com")
    .transform((val) => {
      let cleaned = (val || "").trim();
      if (
        (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
        (cleaned.startsWith("'") && cleaned.endsWith("'"))
      ) {
        cleaned = cleaned.slice(1, -1).trim();
      }
      return cleaned.replace(/['"]/g, "");
    }),
  GOOGLE_PRIVATE_KEY: z
    .string()
    .optional()
    .default("")
    .transform((key) => {
      let formattedKey = (key || "").trim();
      if (
        (formattedKey.startsWith('"') && formattedKey.endsWith('"')) ||
        (formattedKey.startsWith("'") && formattedKey.endsWith("'"))
      ) {
        formattedKey = formattedKey.slice(1, -1);
      }
      return formattedKey.replace(/\\n/g, "\n");
    }),
  GOOGLE_SPREADSHEET_ID: z
    .string()
    .optional()
    .default("")
    .transform((val) => extractSpreadsheetId(val)),
  GOOGLE_DRIVE_ROOT_FOLDER_ID: z
    .string()
    .optional()
    .default("")
    .transform((val) => extractDriveFolderId(val)),
  GOOGLE_REFRESH_TOKEN: z
    .string()
    .optional()
    .default("")
    .transform((val) => {
      let cleaned = (val || "").trim();
      if (
        (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
        (cleaned.startsWith("'") && cleaned.endsWith("'"))
      ) {
        cleaned = cleaned.slice(1, -1).trim();
      }
      return cleaned.replace(/['"]/g, "");
    }),
  JWT_SECRET: z
    .string()
    .optional()
    .default("c81f7d6a4e32098b1e5a2c4d6f8091ab34cd56ef780123456789abcdef012345"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional().default("http://localhost:3000"),
  ADMIN_EMAILS: z
    .string()
    .optional()
    .default("michael.liarzi@gmail.com,admin@example.com"),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function resetEnvCache(): void {
  cachedEnv = null;
}

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  // Merge process.env with any dynamic configuration set through the admin UI
  const dynamicConfig = getDynamicGoogleConfig();

  const merged = {
    ...process.env,
    GOOGLE_REFRESH_TOKEN:
      process.env.GOOGLE_REFRESH_TOKEN ||
      dynamicConfig.oauth_refresh_token ||
      "",
    GOOGLE_SERVICE_ACCOUNT_EMAIL:
      dynamicConfig.service_account_email ||
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      "",
    GOOGLE_PRIVATE_KEY:
      dynamicConfig.service_account_private_key ||
      process.env.GOOGLE_PRIVATE_KEY ||
      "",
    GOOGLE_SPREADSHEET_ID:
      dynamicConfig.spreadsheet_id || process.env.GOOGLE_SPREADSHEET_ID || "",
    GOOGLE_DRIVE_ROOT_FOLDER_ID:
      dynamicConfig.drive_folder_id || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "",
  };

  const result = envSchema.safeParse(merged);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${errorDetails}`);
  }

  cachedEnv = result.data;
  return cachedEnv;
}

export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return getEnv()[prop as keyof Env];
  },
});

export function isProduction(): boolean {
  if (process.env.VERCEL_ENV === "production") return true;
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === "production") return true;
  return false;
}

export function isClientProduction(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  if (
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.includes("-git-") ||
    host.includes("staging") ||
    host.includes("preview")
  ) {
    return false;
  }
  return true;
}
