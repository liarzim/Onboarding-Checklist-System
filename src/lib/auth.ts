import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const VENDOR_AUTH_COOKIE_NAME = "vendor_session";
export const ADMIN_AUTH_COOKIE_NAME = "admin_session";

export interface VendorSession {
  vendor_id: string;
  company_name: string;
  email: string;
  role: "Vendor";
}

export interface AdminSession {
  user_id: string;
  full_name: string;
  email: string;
  role: "HR" | "Admin";
}

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET || "default_jwt_secret_key_at_least_32_characters_long";
  return new TextEncoder().encode(secret);
}

/**
 * Signs a JWT token containing vendor session information.
 */
export async function signVendorToken(payload: VendorSession): Promise<string> {
  const secretKey = getJwtSecretKey();

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secretKey);
}

/**
 * Verifies and decodes a vendor JWT token.
 */
export async function verifyVendorToken(token: string): Promise<VendorSession | null> {
  try {
    const secretKey = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secretKey);

    if (
      typeof payload.vendor_id === "string" &&
      typeof payload.company_name === "string" &&
      typeof payload.email === "string" &&
      payload.role === "Vendor"
    ) {
      return {
        vendor_id: payload.vendor_id,
        company_name: payload.company_name,
        email: payload.email,
        role: "Vendor",
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Signs a JWT token containing HR/Admin session information.
 */
export async function signAdminToken(payload: AdminSession): Promise<string> {
  const secretKey = getJwtSecretKey();

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secretKey);
}

/**
 * Verifies and decodes an admin/HR JWT token.
 */
export async function verifyAdminToken(token: string): Promise<AdminSession | null> {
  try {
    const secretKey = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secretKey);

    if (
      typeof payload.user_id === "string" &&
      typeof payload.full_name === "string" &&
      typeof payload.email === "string" &&
      (payload.role === "HR" || payload.role === "Admin")
    ) {
      return {
        user_id: payload.user_id,
        full_name: payload.full_name,
        email: payload.email,
        role: payload.role as "HR" | "Admin",
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Retrieves the current vendor session from request cookies.
 */
export async function getVendorSession(): Promise<VendorSession | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(VENDOR_AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    return await verifyVendorToken(token);
  } catch {
    return null;
  }
}

/**
 * Retrieves the current admin/HR session from request cookies.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(ADMIN_AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    return await verifyAdminToken(token);
  } catch {
    return null;
  }
}

/**
 * Sets the vendor session HttpOnly cookie.
 */
export function setVendorAuthCookie(token: string): void {
  const cookieStore = cookies();
  cookieStore.set(VENDOR_AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

/**
 * Clears the vendor session cookie.
 */
export function clearVendorAuthCookie(): void {
  const cookieStore = cookies();
  cookieStore.set(VENDOR_AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Sets the admin session HttpOnly cookie.
 */
export function setAdminAuthCookie(token: string): void {
  const cookieStore = cookies();
  cookieStore.set(ADMIN_AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

/**
 * Clears the admin session cookie.
 */
export function clearAdminAuthCookie(): void {
  const cookieStore = cookies();
  cookieStore.set(ADMIN_AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
