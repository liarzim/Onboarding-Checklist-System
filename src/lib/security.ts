import { sheetsRepository } from "./repositories/sheetsRepository";
import type { Candidate } from "@/types/schema";

export class ForbiddenError extends Error {
  public readonly statusCode = 403;

  constructor(message: string = "Forbidden: Access denied to this resource") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  public readonly statusCode = 404;

  constructor(message: string = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * Validates that the requested candidate_id belongs strictly to the authenticated vendor_id.
 * Throws an HTTP 403 Forbidden error if ownership check fails.
 */
export async function assertVendorOwnership(
  vendorId: string,
  candidateId: string
): Promise<Candidate> {
  if (!vendorId || !candidateId) {
    throw new ForbiddenError("Vendor ID and Candidate ID are required for authorization");
  }

  const candidate = await sheetsRepository.getCandidateById(candidateId);

  if (!candidate) {
    throw new NotFoundError(`Candidate "${candidateId}" does not exist`);
  }

  if (candidate.vendor_id !== vendorId) {
    throw new ForbiddenError(
      `Access denied: candidate "${candidateId}" does not belong to vendor "${vendorId}"`
    );
  }

  return candidate;
}

/**
 * Checks if a given email is designated as an authorized Admin in config/environment.
 */
export function isAuthorizedAdminEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const adminEmailsEnv = process.env.ADMIN_EMAILS || "michael.liarzi@gmail.com,admin@example.com";
  const list = adminEmailsEnv
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return list.includes(normalized);
}

/**
 * Asserts that the active user session has the 'Admin' role.
 * Throws ForbiddenError if user is unauthenticated or role is not Admin.
 */
export async function assertAdminRole() {
  const { getAdminSession } = await import("./auth");
  const session = await getAdminSession();

  if (!session || session.role !== "Admin") {
    throw new ForbiddenError("גישה מוגבלת למנהל מערכת בלבד (Admin)");
  }

  return session;
}

/**
 * Neutralizes CSV and Google Sheets formula injection (OWASP A03: Injection).
 * If a text cell begins with =, +, -, @, or tab/carriage return, it prefixes a single quote
 * so spreadsheet engines interpret it strictly as literal text rather than an executable formula.
 */
export function sanitizeSheetCellValue(val: unknown): string {
  if (val === null || val === undefined) {
    return "";
  }
  const str = String(val).trim();
  if (
    str.startsWith("=") ||
    str.startsWith("+") ||
    str.startsWith("-") ||
    str.startsWith("@") ||
    str.startsWith("\t") ||
    str.startsWith("\r")
  ) {
    return `'${str}`;
  }
  return str;
}
