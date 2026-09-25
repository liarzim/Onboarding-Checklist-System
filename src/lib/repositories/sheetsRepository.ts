import { getSheetsClient } from "../google";
import { getEnv, isProduction } from "../env";
import { loadTestStore, saveTestStore, recordDeletedCandidate } from "../testStore";
import type {
  Candidate,
  ChecklistItem,
  DocumentType,
  Vendor,
  SettingStage,
  AuditLogEntry,
  AdminUser,
} from "@/types/schema";
import { sanitizeSheetCellValue } from "../security";

export const SHEET_NAMES = {
  CANDIDATES: "Candidates",
  CHECKLIST_ITEMS: "ChecklistItems",
  DOCUMENT_TYPES: "DocumentTypes",
  AUDIT_LOGS: "AuditLogs",
  VENDORS: "Vendors",
  SETTING_STAGES: "SettingStages",
  PROJECTS: "Projects",
  ADMINS: "Admins",
} as const;

export const DEFAULT_VENDORS: Vendor[] = [
  {
    vendor_id: "vendor_demo",
    company_name: "ספק דמו - מטריקס טכנולוגיות בע\"מ",
    contact_name: "אבי כהן (מנהל גיוס)",
    contact_email: "vendor@demo.co.il",
    is_active: true,
  },
];

export const DEFAULT_REQUIRED_DOCUMENTS: Omit<DocumentType, "template_drive_url">[] = [
  { doc_type_id: "doc_1", doc_name: "שאלון אישי רמה 5", is_required: true, order_index: 1 },
  { doc_type_id: "doc_2", doc_name: "עלון מידע לנבדק", is_required: true, order_index: 2 },
  { doc_type_id: "doc_3", doc_name: "הצהרה על קבלת כרטיס חכם", is_required: true, order_index: 3 },
  { doc_type_id: "doc_4", doc_name: "הסכמה למסירת מידע פלילי", is_required: true, order_index: 4 },
  { doc_type_id: "doc_5", doc_name: "התחייבות לשמירת סודיות", is_required: true, order_index: 5 },
  { doc_type_id: "doc_6", doc_name: "התחייבות לשמירת פרטיות", is_required: true, order_index: 6 },
  { doc_type_id: "doc_7", doc_name: "הימנעות מעבירות מחשב", is_required: true, order_index: 7 },
  { doc_type_id: "doc_8", doc_name: "הסכמה לניטור סייבר", is_required: true, order_index: 8 },
  { doc_type_id: "doc_9", doc_name: "בקשה להנפקת כרטיס חכם", is_required: true, order_index: 9 },
  { doc_type_id: "doc_10", doc_name: "צילום תעודת זהות וספח", is_required: true, order_index: 10 },
  { doc_type_id: "doc_11", doc_name: "תמונת פספורט רשמית", is_required: true, order_index: 11 },
];

export const DEFAULT_SETTING_STAGES: SettingStage[] = [
  { stage_id: "stage_1", stage_name: "איסוף מסמכים ראשוני", stage_order: 1, is_terminal: false },
  { stage_id: "stage_2", stage_name: "בדיקת ביטחון שדה", stage_order: 2, is_terminal: false },
  { stage_id: "stage_3", stage_name: "אימות מסמכים ומשאבי אנוש", stage_order: 3, is_terminal: false },
  { stage_id: "stage_4", stage_name: "מוכן להנפקת כרטיס חכם", stage_order: 4, is_terminal: false },
  { stage_id: "stage_completed", stage_name: "הושלם והונפק כרטיס", stage_order: 5, is_terminal: true },
];

export interface ICandidatesFilter {
  vendor_id?: string;
  is_completed?: boolean;
}

export class SheetsRepository {
  private getSpreadsheetId(): string {
    return getEnv().GOOGLE_SPREADSHEET_ID;
  }

  /**
   * Fetches candidate list with optional filtering by vendor_id and is_completed status.
  /**
   * Appends candidate to Google Sheets Candidates tab.
   * Returns true if successfully written to Google Sheets, false otherwise.
   */
  async appendCandidateToSheet(candidate: Candidate): Promise<boolean> {
    try {
      const sheets = getSheetsClient();
      const spreadsheetId = this.getSpreadsheetId();
      if (!spreadsheetId) return false;

      const accessToken =
        candidate.access_token ||
        `token_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const tokenExpiresAt =
        candidate.token_expires_at ||
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      const row = [
        sanitizeSheetCellValue(candidate.candidate_id),
        sanitizeSheetCellValue(candidate.full_name),
        sanitizeSheetCellValue(candidate.id_number),
        sanitizeSheetCellValue(candidate.email),
        sanitizeSheetCellValue(candidate.phone),
        sanitizeSheetCellValue(candidate.vendor_id),
        sanitizeSheetCellValue(candidate.project_id),
        sanitizeSheetCellValue(candidate.drive_folder_id),
        sanitizeSheetCellValue(candidate.current_stage_id || "stage_1"),
        candidate.is_completed ? "TRUE" : "FALSE",
        candidate.created_at || new Date().toISOString(),
        candidate.updated_at || new Date().toISOString(),
        accessToken,
        tokenExpiresAt,
        candidate.is_signed_by_candidate ? "TRUE" : "FALSE",
        candidate.signature_url || "",
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${SHEET_NAMES.CANDIDATES}!A:P`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [row],
        },
      });
      return true;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      console.error("Could not append candidate to Google Sheet:", err);

      const env = getEnv();
      const isConfigured = Boolean(
        (env.GOOGLE_PRIVATE_KEY && env.GOOGLE_PRIVATE_KEY.length > 50) ||
        (env.GOOGLE_SPREADSHEET_ID && env.GOOGLE_SPREADSHEET_ID !== "your_google_spreadsheet_id_here")
      );

      if (isConfigured) {
        throw new Error(`שגיאה בשמירת המועמד ב-Google Sheets: ${errMsg}`);
      }
      return false;
    }
  }

  /**
   * Fetches candidate list with optional filtering by vendor_id and is_completed status.
   */
  async getCandidates(filter?: ICandidatesFilter): Promise<Candidate[]> {
    let sheetCandidates: Candidate[] = [];
    let isSheetsConnected = false;
    try {
      const sheets = getSheetsClient();
      const spreadsheetId = this.getSpreadsheetId();

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.CANDIDATES}!A2:P`,
      });

      const rows = response.data.values || [];

      sheetCandidates = rows
        .map((row) => ({
          candidate_id: String(row[0] || ""),
          full_name: String(row[1] || ""),
          id_number: String(row[2] || ""),
          email: String(row[3] || ""),
          phone: String(row[4] || ""),
          vendor_id: String(row[5] || ""),
          project_id: String(row[6] || ""),
          drive_folder_id: String(row[7] || ""),
          current_stage_id: String(row[8] || "stage_1"),
          is_completed: String(row[9] ?? "").toUpperCase() === "TRUE",
          created_at: String(row[10] || new Date().toISOString()),
          updated_at: String(row[11] || new Date().toISOString()),
          access_token: row[12] ? String(row[12]) : null,
          token_expires_at: row[13] ? String(row[13]) : null,
          is_signed_by_candidate: String(row[14] ?? "").toUpperCase() === "TRUE",
          signature_url: row[15] ? String(row[15]) : null,
        }))
        .filter((c) => c.candidate_id && c.candidate_id.trim().length > 0);

      isSheetsConnected = true;
    } catch {
      // Ignore Google Sheets fetch error and merge with testStore
    }

    // When Google Sheets is connected: Google Sheets is the single source of truth!
    // NEVER merge testStore or client cookies into Google Sheets candidates list,
    // and NEVER auto-append dead candidates from client cookies back to Google Sheets!
    if (isSheetsConnected) {
      return sheetCandidates.filter((c) => {
        if (filter?.vendor_id !== undefined && c.vendor_id !== filter.vendor_id) {
          return false;
        }
        if (filter?.is_completed !== undefined && c.is_completed !== filter.is_completed) {
          return false;
        }
        return true;
      });
    }

    // Google Sheets is NOT connected (offline / local development without Google credentials):
    if (!isProduction()) {
      const testStore = loadTestStore();
      const deletedSet = new Set(testStore.deletedCandidateIds || []);
      return testStore.candidates
        .filter((c) => !deletedSet.has(c.candidate_id))
        .filter((c) => {
          if (filter?.vendor_id !== undefined && c.vendor_id !== filter.vendor_id) {
            return false;
          }
          if (filter?.is_completed !== undefined && c.is_completed !== filter.is_completed) {
            return false;
          }
          return true;
        });
    }

    return [];
  }

  /**
   * Retrieves a candidate by unique candidate_id.
   */
  async getCandidateById(candidate_id: string): Promise<Candidate | null> {
    if (!candidate_id) return null;
    const candidates = await this.getCandidates();
    return candidates.find((c) => c.candidate_id === candidate_id) || null;
  }

  /**
   * Retrieves a candidate by access_token (or fallback to candidate_id).
   */
  async getCandidateByToken(token: string): Promise<Candidate | null> {
    if (!token) return null;
    const candidates = await this.getCandidates();
    return (
      candidates.find(
        (c) => c.access_token === token || c.candidate_id === token
      ) || null
    );
  }

  /**
   * Deletes a candidate from Candidates sheet and testStore.
   */
  async deleteCandidate(candidate_id: string): Promise<void> {
    // 1. Delete from local testStore and blacklist permanently
    recordDeletedCandidate(candidate_id);

    // 2. Delete from Google Sheets if connected
    try {
      const sheets = getSheetsClient();
      const spreadsheetId = this.getSpreadsheetId();
      if (!spreadsheetId) return;

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.CANDIDATES}!A2:A`,
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((row) => String(row[0] || "") === candidate_id);

      if (rowIndex >= 0) {
        const sheetRowNumber = rowIndex + 2;
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `${SHEET_NAMES.CANDIDATES}!A${sheetRowNumber}:P${sheetRowNumber}`,
        });
      }
    } catch (err) {
      console.warn("Sheets deleteCandidate fallback:", err);
    }
  }

  /**
   * Updates candidate upon digital signing in the candidate portal.
   */
  async markCandidateSigned(
    candidate_id: string,
    updateData: {
      full_name?: string;
      id_number?: string;
      project_id?: string;
      signature_url?: string;
    }
  ): Promise<void> {
    // 1. Update in local testStore
    const testStore = loadTestStore();
    const candidateIdx = testStore.candidates.findIndex((c) => c.candidate_id === candidate_id);
    const now = new Date().toISOString();
    if (candidateIdx >= 0) {
      const c = testStore.candidates[candidateIdx];
      testStore.candidates[candidateIdx] = {
        ...c,
        full_name: updateData.full_name || c.full_name,
        id_number: updateData.id_number || c.id_number,
        project_id: updateData.project_id || c.project_id,
        current_stage_id: "stage_2",
        is_signed_by_candidate: true,
        signature_url: updateData.signature_url || c.signature_url,
        updated_at: now,
      };
      saveTestStore(testStore);
    }

    try {
      const sheets = getSheetsClient();
      const spreadsheetId = this.getSpreadsheetId();

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.CANDIDATES}!A2:P`,
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((row) => String(row[0] || "") === candidate_id);

      if (rowIndex >= 0) {
        const sheetRowNumber = rowIndex + 2;

        if (updateData.full_name) {
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${SHEET_NAMES.CANDIDATES}!B${sheetRowNumber}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [[sanitizeSheetCellValue(updateData.full_name)]] },
          });
        }

        if (updateData.id_number) {
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${SHEET_NAMES.CANDIDATES}!C${sheetRowNumber}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [[sanitizeSheetCellValue(updateData.id_number)]] },
          });
        }

        if (updateData.project_id) {
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${SHEET_NAMES.CANDIDATES}!G${sheetRowNumber}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [[sanitizeSheetCellValue(updateData.project_id)]] },
          });
        }

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_NAMES.CANDIDATES}!I${sheetRowNumber}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [["stage_2"]] },
        });

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_NAMES.CANDIDATES}!L${sheetRowNumber}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [[now]] },
        });

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_NAMES.CANDIDATES}!O${sheetRowNumber}:P${sheetRowNumber}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [["TRUE", updateData.signature_url || ""]] },
        });
      }
    } catch (err) {
      console.warn("Sheets markCandidateSigned offline fallback:", err);
    }
  }

  /**
   * Creates a new candidate row in the Candidates sheet.
   */
  async createCandidate(candidate: Candidate): Promise<void> {
    const accessToken = candidate.access_token || `token_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const tokenExpiresAt = candidate.token_expires_at || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const candidateWithToken: Candidate = {
      ...candidate,
      access_token: accessToken,
      token_expires_at: tokenExpiresAt,
    };

    // Save to local test store
    const testStore = loadTestStore();
    const existingIdx = testStore.candidates.findIndex((c) => c.candidate_id === candidate.candidate_id);
    if (existingIdx >= 0) {
      testStore.candidates[existingIdx] = candidateWithToken;
    } else {
      testStore.candidates.unshift(candidateWithToken);
    }
    saveTestStore(testStore);

    await this.appendCandidateToSheet(candidateWithToken);
  }

  /**
   * Updates candidate stage in Candidates sheet.
   */
  async updateCandidateStage(candidate_id: string, stage_id: string): Promise<void> {
    const now = new Date().toISOString();

    // 1. Update in local testStore
    const testStore = loadTestStore();
    const cIdx = testStore.candidates.findIndex((c) => c.candidate_id === candidate_id);
    if (cIdx >= 0) {
      testStore.candidates[cIdx] = {
        ...testStore.candidates[cIdx],
        current_stage_id: stage_id,
        is_completed: stage_id === "stage_completed",
        updated_at: now,
      };
      saveTestStore(testStore);
    }

    try {
      const sheets = getSheetsClient();
      const spreadsheetId = this.getSpreadsheetId();

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.CANDIDATES}!A2:L`,
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((row) => String(row[0] || "") === candidate_id);

      if (rowIndex >= 0) {
        const sheetRowNumber = rowIndex + 2;

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_NAMES.CANDIDATES}!I${sheetRowNumber}`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [[stage_id]],
          },
        });

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_NAMES.CANDIDATES}!L${sheetRowNumber}`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [[now]],
          },
        });
      }
    } catch (err) {
      console.warn("Sheets updateCandidateStage offline fallback:", err);
    }
  }

  /**
   * Updates candidate's Drive folder ID in Candidates sheet and local testStore.
   */
  async updateCandidateDriveFolder(candidate_id: string, drive_folder_id: string): Promise<void> {
    const now = new Date().toISOString();

    // 1. Update in local testStore
    const testStore = loadTestStore();
    const cIdx = testStore.candidates.findIndex((c) => c.candidate_id === candidate_id);
    if (cIdx >= 0) {
      testStore.candidates[cIdx] = {
        ...testStore.candidates[cIdx],
        drive_folder_id,
        updated_at: now,
      };
      saveTestStore(testStore);
    }

    try {
      const sheets = getSheetsClient();
      const spreadsheetId = this.getSpreadsheetId();
      if (!spreadsheetId) return;

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.CANDIDATES}!A2:H`,
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((row) => String(row[0] || "") === candidate_id);

      if (rowIndex >= 0) {
        const sheetRowNumber = rowIndex + 2;
        // Column H is drive_folder_id
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_NAMES.CANDIDATES}!H${sheetRowNumber}`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [[drive_folder_id]],
          },
        });
      }
    } catch (err) {
      console.warn("Sheets updateCandidateDriveFolder fallback:", err);
    }
  }

  /**
   * Sets is_completed to true and updates stage to stage_completed.
   */
  async completeCandidate(candidate_id: string): Promise<void> {
    const now = new Date().toISOString();

    // 1. Update in local testStore
    const testStore = loadTestStore();
    const cIdx = testStore.candidates.findIndex((c) => c.candidate_id === candidate_id);
    if (cIdx >= 0) {
      testStore.candidates[cIdx] = {
        ...testStore.candidates[cIdx],
        current_stage_id: "stage_completed",
        is_completed: true,
        updated_at: now,
      };
      saveTestStore(testStore);
    }

    try {
      const sheets = getSheetsClient();
      const spreadsheetId = this.getSpreadsheetId();

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.CANDIDATES}!A2:L`,
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((row) => String(row[0] || "") === candidate_id);

      if (rowIndex >= 0) {
        const sheetRowNumber = rowIndex + 2;

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_NAMES.CANDIDATES}!I${sheetRowNumber}:L${sheetRowNumber}`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [["stage_completed", "TRUE", rows[rowIndex][10] || now, now]],
          },
        });
      }
    } catch (err) {
      console.warn("Sheets completeCandidate offline fallback:", err);
    }
  }

  /**
   * Retrieves workflow stages from SettingStages tab or defaults.
   */
  async getSettingStages(): Promise<SettingStage[]> {
    try {
      const sheets = getSheetsClient();
      const spreadsheetId = this.getSpreadsheetId();

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.SETTING_STAGES}!A2:D`,
      });

      const rows = response.data.values || [];
      const validRows = rows.filter((row) => row && row[0] && String(row[0]).trim().length > 0);

      if (validRows.length === 0) {
        return DEFAULT_SETTING_STAGES;
      }

      return validRows.map((row) => ({
        stage_id: String(row[0] || ""),
        stage_name: String(row[1] || ""),
        stage_order: Number(row[2] || 0),
        is_terminal: String(row[3] ?? "").toUpperCase() === "TRUE",
      }));
    } catch {
      return DEFAULT_SETTING_STAGES;
    }
  }

  /**
   * Retrieves document types from DocumentTypes sheet, falling back to default required documents.
   */
  async getDocumentTypes(): Promise<DocumentType[]> {
    try {
      const sheets = getSheetsClient();
      const spreadsheetId = this.getSpreadsheetId();

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.DOCUMENT_TYPES}!A2:E`,
      });

      const rows = response.data.values || [];
      const validRows = rows.filter((row) => row && row[0] && String(row[0]).trim().length > 0);

      if (validRows.length === 0) {
        return DEFAULT_REQUIRED_DOCUMENTS.map((doc) => ({
          ...doc,
          template_drive_url: null,
        }));
      }

      const existingDocIds = new Set(validRows.map((r) => String(r[0] || "").trim()));
      const parsedDocs: DocumentType[] = validRows.map((row) => ({
        doc_type_id: String(row[0] || ""),
        doc_name: String(row[1] || ""),
        is_required: String(row[2] ?? "").toUpperCase() === "TRUE",
        template_drive_url: row[3] ? String(row[3]) : null,
        order_index: Number(row[4] || 0),
      }));

      // Ensure doc_10 and doc_11 exist even if the sheet was initialized previously
      DEFAULT_REQUIRED_DOCUMENTS.forEach((defDoc) => {
        if (!existingDocIds.has(defDoc.doc_type_id)) {
          parsedDocs.push({
            ...defDoc,
            template_drive_url: null,
          });
        }
      });

      parsedDocs.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      return parsedDocs;
    } catch {
      return DEFAULT_REQUIRED_DOCUMENTS.map((doc) => ({
        ...doc,
        template_drive_url: null,
      }));
    }
  }

  /**
   * Retrieves checklist items for a specific candidate.
   */
  async getChecklist(candidate_id: string): Promise<ChecklistItem[]> {
    let sheetItems: ChecklistItem[] = [];
    try {
      const sheets = getSheetsClient();
      const spreadsheetId = this.getSpreadsheetId();

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.CHECKLIST_ITEMS}!A2:H`,
      });

      const rows = response.data.values || [];

      sheetItems = rows
        .filter((row) => String(row[1] || "") === candidate_id)
        .map((row) => ({
          checklist_item_id: String(row[0] || ""),
          candidate_id: String(row[1] || ""),
          doc_type_id: String(row[2] || ""),
          status: String(row[3] || "Not_Uploaded"),
          file_name: row[4] ? String(row[4]) : null,
          file_drive_id: row[5] ? String(row[5]) : null,
          file_drive_url: row[6] ? String(row[6]) : null,
          updated_at: String(row[7] || new Date().toISOString()),
        }));
    } catch {
      // Ignore and fallback to testStore
    }

    const testStore = loadTestStore();
    const testItems = testStore.checklistItems.filter((item) => item.candidate_id === candidate_id);

    // Merge sheet items and test items
    const merged = [...sheetItems];
    const sheetDocTypeIds = new Set(sheetItems.map((i) => i.doc_type_id));
    for (const tItem of testItems) {
      if (!sheetDocTypeIds.has(tItem.doc_type_id)) {
        merged.push(tItem);
      }
    }

    const candidate = await this.getCandidateById(candidate_id);
    let finalItems = merged;

    if (finalItems.length === 0) {
      // Auto-initialize if still empty
      const docTypes = await this.getDocumentTypes();
      await this.initChecklist(candidate_id, docTypes);
      const refreshed = loadTestStore();
      finalItems = refreshed.checklistItems.filter((item) => item.candidate_id === candidate_id);
    }

    if (candidate?.is_signed_by_candidate) {
      finalItems = finalItems.map((item) => {
        const st = (item.status || "").toLowerCase();
        if (st === "not_uploaded" || !st) {
          return {
            ...item,
            status: "Uploaded",
            file_name: item.file_name || `מסמך חתום - ${candidate.full_name}`,
          };
        }
        return item;
      });
    }

    return finalItems;
  }

  /**
   * Initializes default checklist items for a candidate with status 'Not_Uploaded'.
   */
  async initChecklist(
    candidate_id: string,
    docTypes: DocumentType[] = DEFAULT_REQUIRED_DOCUMENTS.map((d) => ({ ...d, template_drive_url: null }))
  ): Promise<void> {
    if (!docTypes || docTypes.length === 0) {
      return;
    }

    const now = new Date().toISOString();
    const testStore = loadTestStore();
    for (const docType of docTypes) {
      const existing = testStore.checklistItems.find(
        (i) => i.candidate_id === candidate_id && i.doc_type_id === docType.doc_type_id
      );
      if (!existing) {
        testStore.checklistItems.push({
          checklist_item_id: `${candidate_id}_${docType.doc_type_id}`,
          candidate_id,
          doc_type_id: docType.doc_type_id,
          status: "Not_Uploaded",
          file_name: null,
          file_drive_id: null,
          file_drive_url: null,
          updated_at: now,
        });
      }
    }
    saveTestStore(testStore);

    try {
      const sheets = getSheetsClient();
      const spreadsheetId = this.getSpreadsheetId();

      const rows = docTypes.map((docType, index) => [
        `${candidate_id}_${docType.doc_type_id || index + 1}`,
        candidate_id,
        docType.doc_type_id,
        "Not_Uploaded",
        "",
        "",
        "",
        now,
      ]);

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${SHEET_NAMES.CHECKLIST_ITEMS}!A:H`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: rows,
        },
      });
    } catch (err) {
      console.warn("Sheets initChecklist offline fallback:", err);
    }
  }

  /**
   * Updates an existing checklist item for a candidate and doc type.
   */
  async updateChecklistItem(
    candidate_id: string,
    doc_type_id: string,
    update: {
      status: string;
      file_name?: string | null;
      file_drive_id?: string | null;
      file_drive_url?: string | null;
    }
  ): Promise<void> {
    const now = new Date().toISOString();
    const testStore = loadTestStore();
    const itemIndex = testStore.checklistItems.findIndex(
      (item) => item.candidate_id === candidate_id && item.doc_type_id === doc_type_id
    );

    if (itemIndex >= 0) {
      testStore.checklistItems[itemIndex] = {
        ...testStore.checklistItems[itemIndex],
        status: update.status,
        file_name: update.file_name ?? testStore.checklistItems[itemIndex].file_name,
        file_drive_id: update.file_drive_id ?? testStore.checklistItems[itemIndex].file_drive_id,
        file_drive_url: update.file_drive_url ?? testStore.checklistItems[itemIndex].file_drive_url,
        updated_at: now,
      };
    } else {
      testStore.checklistItems.push({
        checklist_item_id: `${candidate_id}_${doc_type_id}`,
        candidate_id,
        doc_type_id,
        status: update.status,
        file_name: update.file_name || null,
        file_drive_id: update.file_drive_id || null,
        file_drive_url: update.file_drive_url || null,
        updated_at: now,
      });
    }
    saveTestStore(testStore);

    try {
      const sheets = getSheetsClient();
      const spreadsheetId = this.getSpreadsheetId();

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.CHECKLIST_ITEMS}!A2:H`,
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex(
        (row) => String(row[1] || "") === candidate_id && String(row[2] || "") === doc_type_id
      );

      if (rowIndex >= 0) {
        const sheetRowNumber = rowIndex + 2;
        const currentRow = rows[rowIndex];

        const updatedRow = [
          currentRow[0] || `${candidate_id}_${doc_type_id}`,
          candidate_id,
          doc_type_id,
          update.status,
          update.file_name ?? currentRow[4] ?? "",
          update.file_drive_id ?? currentRow[5] ?? "",
          update.file_drive_url ?? currentRow[6] ?? "",
          now,
        ];

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_NAMES.CHECKLIST_ITEMS}!A${sheetRowNumber}:H${sheetRowNumber}`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [updatedRow],
          },
        });
      } else {
        const newRow = [
          `${candidate_id}_${doc_type_id}`,
          candidate_id,
          doc_type_id,
          update.status,
          update.file_name || "",
          update.file_drive_id || "",
          update.file_drive_url || "",
          now,
        ];

        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${SHEET_NAMES.CHECKLIST_ITEMS}!A:H`,
          valueInputOption: "USER_ENTERED",
          insertDataOption: "INSERT_ROWS",
          requestBody: {
            values: [newRow],
          },
        });
      }
    } catch (err) {
      console.warn("Sheets updateChecklistItem offline fallback:", err);
    }
  }

  /**
   * Retrieves a vendor by contact email.
   */
  async getVendorByEmail(email: string): Promise<Vendor | null> {
    const vendors = await this.getVendors();
    const normalized = email.trim().toLowerCase();
    return vendors.find((v) => v.contact_email.trim().toLowerCase() === normalized) || null;
  }

  /**
   * Retrieves a vendor by vendor_id.
   */
  async getVendorById(vendor_id: string): Promise<Vendor | null> {
    const vendors = await this.getVendors();
    return vendors.find((v) => v.vendor_id === vendor_id) || null;
  }

  /**
   * Fetches all vendors from the Vendors sheet.
   */
  async getVendors(): Promise<Vendor[]> {
    try {
      const sheets = getSheetsClient();
      const spreadsheetId = this.getSpreadsheetId();

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.VENDORS}!A2:E`,
      });

      const rows = response.data.values || [];
      const sheetVendors = rows.map((row) => ({
        vendor_id: String(row[0] || ""),
        company_name: String(row[1] || ""),
        contact_name: String(row[2] || ""),
        contact_email: String(row[3] || ""),
        is_active: String(row[4] ?? "").toUpperCase() !== "FALSE",
      }));

      // Merge defaults with sheet vendors without duplicate emails
      const vendorMap = new Map<string, Vendor>();
      for (const def of DEFAULT_VENDORS) {
        vendorMap.set(def.contact_email.toLowerCase(), def);
      }
      for (const v of sheetVendors) {
        vendorMap.set(v.contact_email.toLowerCase(), v);
      }
      return Array.from(vendorMap.values());
    } catch {
      return DEFAULT_VENDORS;
    }
  }

  /**
   * Appends an entry to the AuditLogs sheet.
   */
  async appendAuditLog(entry: AuditLogEntry): Promise<void> {
    try {
      const sheets = getSheetsClient();
      const spreadsheetId = this.getSpreadsheetId();

      const row = [
        sanitizeSheetCellValue(entry.log_id),
        sanitizeSheetCellValue(entry.timestamp),
        sanitizeSheetCellValue(entry.actor_email),
        sanitizeSheetCellValue(entry.actor_role),
        sanitizeSheetCellValue(entry.action_type),
        sanitizeSheetCellValue(entry.entity_type),
        sanitizeSheetCellValue(entry.entity_id),
        sanitizeSheetCellValue(entry.details),
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${SHEET_NAMES.AUDIT_LOGS}!A:H`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [row],
        },
      });
    } catch (err) {
      console.warn("Sheets appendAuditLog offline fallback:", err);
    }
  }

  /**
   * Retrieves audit log records with optional filtering, sorted newest first.
   */
  async getAuditLogs(filter?: {
    dateFrom?: string;
    dateTo?: string;
    actionType?: string;
    actorEmail?: string;
  }): Promise<AuditLogEntry[]> {
    const sheets = getSheetsClient();
    const spreadsheetId = this.getSpreadsheetId();

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.AUDIT_LOGS}!A2:H`,
      });

      const rows = response.data.values || [];

      const entries: AuditLogEntry[] = rows.map((row) => ({
        log_id: String(row[0] || ""),
        timestamp: String(row[1] || new Date().toISOString()),
        actor_email: String(row[2] || ""),
        actor_role: String(row[3] || ""),
        action_type: String(row[4] || ""),
        entity_type: String(row[5] || ""),
        entity_id: String(row[6] || ""),
        details: String(row[7] || ""),
      }));

      // Filter entries
      const filtered = entries.filter((entry) => {
        if (filter?.actionType && entry.action_type !== filter.actionType) {
          return false;
        }

        if (
          filter?.actorEmail &&
          !entry.actor_email.toLowerCase().includes(filter.actorEmail.toLowerCase())
        ) {
          return false;
        }

        if (filter?.dateFrom) {
          const entryTime = new Date(entry.timestamp).getTime();
          const fromTime = new Date(filter.dateFrom).getTime();
          if (entryTime < fromTime) return false;
        }

        if (filter?.dateTo) {
          const entryTime = new Date(entry.timestamp).getTime();
          const toTime = new Date(filter.dateTo);
          toTime.setHours(23, 59, 59, 999);
          if (entryTime > toTime.getTime()) return false;
        }

        return true;
      });

      // Sort newest first
      return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch {
      return [];
    }
  }

  /**
   * Saves updated workflow stages to SettingStages sheet.
   */
  async saveSettingStages(stages: SettingStage[]): Promise<void> {
    const sheets = getSheetsClient();
    const spreadsheetId = this.getSpreadsheetId();

    const rows = stages.map((s, idx) => [
      sanitizeSheetCellValue(s.stage_id),
      sanitizeSheetCellValue(s.stage_name),
      idx + 1,
      s.is_terminal ? "TRUE" : "FALSE",
    ]);

    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${SHEET_NAMES.SETTING_STAGES}!A2:D`,
      });
    } catch {
      // Ignore if clear range error
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAMES.SETTING_STAGES}!A2:D${rows.length + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: rows,
      },
    });
  }

  /**
   * Saves updated document types to DocumentTypes sheet.
   */
  async saveDocumentTypes(docTypes: DocumentType[]): Promise<void> {
    const sheets = getSheetsClient();
    const spreadsheetId = this.getSpreadsheetId();

    const rows = docTypes.map((d, idx) => [
      sanitizeSheetCellValue(d.doc_type_id),
      sanitizeSheetCellValue(d.doc_name),
      d.is_required ? "TRUE" : "FALSE",
      sanitizeSheetCellValue(d.template_drive_url || ""),
      idx + 1,
    ]);

    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${SHEET_NAMES.DOCUMENT_TYPES}!A2:E`,
      });
    } catch {
      // Ignore if clear range error
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAMES.DOCUMENT_TYPES}!A2:E${rows.length + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: rows,
      },
    });
  }

  /**
   * Creates or updates a vendor in the Vendors sheet.
   */
  async saveVendor(vendor: Vendor): Promise<void> {
    const sheets = getSheetsClient();
    const spreadsheetId = this.getSpreadsheetId();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAMES.VENDORS}!A2:E`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((row) => String(row[0] || "") === vendor.vendor_id);

    const vendorRow = [
      sanitizeSheetCellValue(vendor.vendor_id),
      sanitizeSheetCellValue(vendor.company_name),
      sanitizeSheetCellValue(vendor.contact_name),
      sanitizeSheetCellValue(vendor.contact_email),
      vendor.is_active ? "TRUE" : "FALSE",
    ];

    if (rowIndex >= 0) {
      const sheetRowNumber = rowIndex + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAMES.VENDORS}!A${sheetRowNumber}:E${sheetRowNumber}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [vendorRow],
        },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${SHEET_NAMES.VENDORS}!A:E`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [vendorRow],
        },
      });
    }
  }

  /**
   * Retrieves projects list from Projects sheet tab, falling back to active candidates and defaults.
   */
  async getProjects(): Promise<string[]> {
    const sheets = getSheetsClient();
    const spreadsheetId = this.getSpreadsheetId();

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.PROJECTS}!A2:A`,
      });

      const rows = response.data.values || [];
      const sheetProjects = rows.map((r) => String(r[0] || "").trim()).filter(Boolean);

      if (sheetProjects.length > 0) {
        return Array.from(new Set(sheetProjects));
      }
    } catch {
      // Tab may not exist yet
    }

    try {
      // Fallback: extract distinct projects from candidates
      const candidates = await this.getCandidates();
      const candidateProjects = candidates.map((c) => c.project_id.trim()).filter(Boolean);
      const defaultProjects = ["פרויקט אלפא", "פרויקט סייבר", "פרויקט ענן", "פרויקט תשתיות"];
      return Array.from(new Set([...candidateProjects, ...defaultProjects]));
    } catch {
      return ["פרויקט אלפא", "פרויקט סייבר", "פרויקט ענן", "פרויקט תשתיות"];
    }
  }

  /**
   * Saves recruitment projects to Projects sheet tab.
   */
  async saveProjects(projects: string[]): Promise<void> {
    const sheets = getSheetsClient();
    const spreadsheetId = this.getSpreadsheetId();

    const uniqueProjects = Array.from(new Set(projects.map((p) => p.trim()).filter(Boolean)));
    const rows = uniqueProjects.map((p) => [sanitizeSheetCellValue(p)]);

    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${SHEET_NAMES.PROJECTS}!A2:A`,
      });
    } catch {
      // Ignore if tab does not exist yet
    }

    if (rows.length > 0) {
      try {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_NAMES.PROJECTS}!A2:A${rows.length + 1}`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: rows,
          },
        });
      } catch {
        // If sheet tab is missing, we append
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${SHEET_NAMES.PROJECTS}!A:A`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [["שם פרויקט"], ...rows],
          },
        });
      }
    }
  }

  /**
   * Retrieves all registered administrators and HR managers.
   * Merges records from Google Sheets 'Admins' tab with environment default admins.
   */
  async getAdmins(): Promise<AdminUser[]> {
    const sheets = getSheetsClient();
    const spreadsheetId = this.getSpreadsheetId();

    const envDefaults: AdminUser[] = [
      {
        email: "hr@demo.co.il",
        full_name: "דנה כהן (רכזת קליטה ומשאבי אנוש)",
        role: "HR",
        password_hash: "",
        must_change_password: false,
        auth_provider: "both",
        added_at: "מערכת משאבי אנוש",
      },
      {
        email: "michael.liarzi@gmail.com",
        full_name: "מיכאל (מנהל ראשי)",
        role: "Admin",
        password_hash: "",
        must_change_password: false,
        auth_provider: "both",
        added_at: "מערכת ראשית",
      },
      {
        email: "admin@example.com",
        full_name: "מנהל מערכת ראשי",
        role: "Admin",
        password_hash: "",
        must_change_password: false,
        auth_provider: "both",
        added_at: "ברירת מחדל",
      },
    ];

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.ADMINS}!A2:G`,
      });

      const rows = response.data.values || [];
      const sheetAdmins: AdminUser[] = rows
        .map((row) => ({
          email: String(row[0] || "").trim().toLowerCase(),
          full_name: String(row[1] || "").trim(),
          role: (String(row[2] || "").trim() === "HR" ? "HR" : "Admin") as "Admin" | "HR",
          password_hash: String(row[3] || "").trim(),
          must_change_password: String(row[4] || "").trim().toUpperCase() === "TRUE",
          auth_provider: (String(row[5] || "").trim() || "both") as "local" | "google" | "both",
          added_at: String(row[6] || "").trim() || new Date().toISOString(),
        }))
        .filter((a) => a.email.length > 0);

      // Merge defaults with sheet admins without duplicate emails
      const emailMap = new Map<string, AdminUser>();
      for (const def of envDefaults) {
        emailMap.set(def.email.toLowerCase(), def);
      }
      for (const adm of sheetAdmins) {
        emailMap.set(adm.email.toLowerCase(), adm);
      }

      return Array.from(emailMap.values());
    } catch {
      return envDefaults;
    }
  }

  /**
   * Retrieves a single admin user by email.
   */
  async getAdminByEmail(email: string): Promise<AdminUser | null> {
    const admins = await this.getAdmins();
    return admins.find((a) => a.email.toLowerCase() === email.trim().toLowerCase()) || null;
  }

  /**
   * Adds or updates an admin / HR user in the Admins sheet tab.
   */
  async saveAdmin(user: AdminUser): Promise<void> {
    const sheets = getSheetsClient();
    const spreadsheetId = this.getSpreadsheetId();
    const normalizedEmail = user.email.trim().toLowerCase();

    let existingRows: any[][] = [];
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.ADMINS}!A2:G`,
      });
      existingRows = response.data.values || [];
    } catch {
      // Tab might not exist yet
    }

    const rowIndex = existingRows.findIndex(
      (row) => String(row[0] || "").trim().toLowerCase() === normalizedEmail
    );

    const adminRow = [
      sanitizeSheetCellValue(normalizedEmail),
      sanitizeSheetCellValue(user.full_name),
      sanitizeSheetCellValue(user.role),
      sanitizeSheetCellValue(user.password_hash || ""),
      user.must_change_password ? "TRUE" : "FALSE",
      sanitizeSheetCellValue(user.auth_provider || "both"),
      sanitizeSheetCellValue(user.added_at || new Date().toISOString()),
    ];

    if (rowIndex >= 0) {
      const sheetRowNumber = rowIndex + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAMES.ADMINS}!A${sheetRowNumber}:G${sheetRowNumber}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [adminRow],
        },
      });
    } else {
      try {
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${SHEET_NAMES.ADMINS}!A:G`,
          valueInputOption: "USER_ENTERED",
          insertDataOption: "INSERT_ROWS",
          requestBody: {
            values: [adminRow],
          },
        });
      } catch {
        // Create tab with header row
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${SHEET_NAMES.ADMINS}!A:G`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [
              [
                "אימייל",
                "שם מלא",
                "תפקיד",
                "סיסמה מוצפנת",
                "חובת שינוי סיסמה",
                "ספק הזדהות",
                "תאריך הוספה",
              ],
              adminRow,
            ],
          },
        });
      }
    }
  }

  /**
   * Removes an administrator by email from the Admins sheet tab.
   */
  async deleteAdmin(email: string): Promise<void> {
    const sheets = getSheetsClient();
    const spreadsheetId = this.getSpreadsheetId();
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.ADMINS}!A2:G`,
      });
      const rows = response.data.values || [];
      const updatedRows = rows.filter(
        (row) => String(row[0] || "").trim().toLowerCase() !== normalizedEmail
      );

      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${SHEET_NAMES.ADMINS}!A2:G`,
      });

      if (updatedRows.length > 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_NAMES.ADMINS}!A2:G${updatedRows.length + 1}`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: updatedRows,
          },
        });
      }
    } catch {
      // Ignore if tab does not exist
    }
  }
}

export const sheetsRepository = new SheetsRepository();
