import { z } from "zod";

export const envSchema = z.object({
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z
    .string()
    .email("GOOGLE_SERVICE_ACCOUNT_EMAIL must be a valid email address"),
  GOOGLE_PRIVATE_KEY: z
    .string()
    .min(1, "GOOGLE_PRIVATE_KEY is required")
    .transform((key) => {
      let formattedKey = key.trim();
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
    .min(1, "GOOGLE_SPREADSHEET_ID is required"),
  GOOGLE_DRIVE_ROOT_FOLDER_ID: z
    .string()
    .min(1, "GOOGLE_DRIVE_ROOT_FOLDER_ID is required"),
  JWT_SECRET: z
    .string()
    .min(16, "JWT_SECRET must be at least 16 characters long"),
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

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = envSchema.safeParse(process.env);
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
