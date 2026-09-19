import { z } from "zod";

export const envSchema = z.object({
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z
    .string()
    .optional()
    .default("service-account@project.iam.gserviceaccount.com"),
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
    .default(""),
  GOOGLE_DRIVE_ROOT_FOLDER_ID: z
    .string()
    .optional()
    .default(""),
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
