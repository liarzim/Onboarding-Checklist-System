import { google, sheets_v4, drive_v3 } from "googleapis";
import { getEnv } from "./env";
import { getDynamicGoogleConfig } from "./dynamicConfig";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
];

let authClient: any = null;
let sheetsInstance: sheets_v4.Sheets | null = null;
let driveInstance: drive_v3.Drive | null = null;

export function getGoogleAuth(): any {
  if (!authClient) {
    const dynamicConfig = getDynamicGoogleConfig();
    const env = getEnv();

    const refreshToken =
      (env.GOOGLE_REFRESH_TOKEN || "").trim() ||
      (dynamicConfig.oauth_refresh_token || "").trim();

    // 1. If OAuth refresh token is available (from env or dynamic config), use it permanently!
    // This provides full personal Google Drive storage quota (15GB+) and never hits Service Account quota limits.
    if (refreshToken && refreshToken.length > 5) {
      const { clientId, clientSecret } = getOAuth2Credentials();
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });
      authClient = oauth2Client;
      return authClient;
    }

    // Default: Service Account JWT
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

export function resetGoogleClients(): void {
  authClient = null;
  sheetsInstance = null;
  driveInstance = null;
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

export function getOAuth2Credentials() {
  let clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
  let clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();

  if (
    (clientId.startsWith('"') && clientId.endsWith('"')) ||
    (clientId.startsWith("'") && clientId.endsWith("'"))
  ) {
    clientId = clientId.slice(1, -1).trim();
  }
  if (
    (clientSecret.startsWith('"') && clientSecret.endsWith('"')) ||
    (clientSecret.startsWith("'") && clientSecret.endsWith("'"))
  ) {
    clientSecret = clientSecret.slice(1, -1).trim();
  }

  // Auto-correct if the first letter 'G' was missed when copying GOCSPX-
  if (clientSecret.startsWith("OCSPX-")) {
    clientSecret = "G" + clientSecret;
  }

  return { clientId, clientSecret };
}

export function getOAuth2Client(redirectUri?: string) {
  const { clientId, clientSecret } = getOAuth2Credentials();
  const callbackUrl =
    redirectUri ||
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/google/callback`;

  return new google.auth.OAuth2(clientId, clientSecret, callbackUrl);
}

export function getGoogleAuthUrl(redirectUri?: string): string {
  const oauth2Client = getOAuth2Client(redirectUri);
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  });
}

export async function verifyGoogleOAuthCode(code: string, redirectUri?: string) {
  const oauth2Client = getOAuth2Client(redirectUri);
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

export function getGoogleDriveConnectUrl(
  redirectUri?: string,
  state: string = "connect_drive"
): string {
  const oauth2Client = getOAuth2Client(redirectUri);
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    state,
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });
}

export async function exchangeCodeForDriveTokens(code: string, redirectUri?: string) {
  const oauth2Client = getOAuth2Client(redirectUri);
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  return {
    email: data.email || "",
    name: data.name || "",
    refreshToken: tokens.refresh_token || "",
    accessToken: tokens.access_token || "",
  };
}

export type { sheets_v4, drive_v3 };
