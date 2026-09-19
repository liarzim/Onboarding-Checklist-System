import crypto from "crypto";

/**
 * Hashes a plaintext password with a random salt using crypto.scrypt.
 * Output format: "salt:hash"
 */
export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

/**
 * Verifies a plaintext password against a stored "salt:hash" string.
 */
export function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!storedHash || !storedHash.includes(":")) {
      return resolve(false);
    }
    const [salt, key] = storedHash.split(":");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return resolve(false);
      const keyBuffer = Buffer.from(key, "hex");
      const match = crypto.timingSafeEqual(keyBuffer, derivedKey);
      resolve(match);
    });
  });
}
