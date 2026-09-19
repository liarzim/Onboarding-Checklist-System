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

export type { sheets_v4, drive_v3 };
