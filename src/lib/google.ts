import { google, sheets_v4, drive_v3 } from "googleapis";
import { getEnv } from "./env";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
];

let authClient: InstanceType<typeof google.auth.JWT> | null = null;
let sheetsInstance: sheets_v4.Sheets | null = null;
let driveInstance: drive_v3.Drive | null = null;

export function getGoogleAuth(): InstanceType<typeof google.auth.JWT> {
  if (!authClient) {
    const env = getEnv();
    authClient = new google.auth.JWT({
      email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: env.GOOGLE_PRIVATE_KEY,
      scopes: GOOGLE_SCOPES,
    });
  }
  return authClient;
}

export function getSheetsClient(): sheets_v4.Sheets {
  if (!sheetsInstance) {
    const auth = getGoogleAuth();
    sheetsInstance = google.sheets({ version: "v4", auth });
  }
  return sheetsInstance;
}

export function getDriveClient(): drive_v3.Drive {
  if (!driveInstance) {
    const auth = getGoogleAuth();
    driveInstance = google.drive({ version: "v3", auth });
  }
  return driveInstance;
}

export const sheetsClient = new Proxy({} as sheets_v4.Sheets, {
  get(_target, prop: string | symbol) {
    const client = getSheetsClient();
    const value = Reflect.get(client, prop);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export const driveClient = new Proxy({} as drive_v3.Drive, {
  get(_target, prop: string | symbol) {
    const client = getDriveClient();
    const value = Reflect.get(client, prop);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export function getOAuth2Client(redirectUri?: string) {
  const env = getEnv();
  const clientId = env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "";
  const callbackUrl =
    redirectUri || `${env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/google/callback`;

  return new google.auth.OAuth2(clientId, clientSecret, callbackUrl);
}

export function getGoogleAuthUrl(): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  });
}

export async function verifyGoogleOAuthCode(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  return {
    email: data.email || "",
    name: data.name || "",
    picture: data.picture || "",
  };
}

export type { sheets_v4, drive_v3 };
