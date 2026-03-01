import { createDecipheriv } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) throw new Error("TOKEN_ENCRYPTION_KEY is not set");
  if (key.length !== 64) throw new Error("TOKEN_ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars)");
  return Buffer.from(key, "hex");
}

/**
 * Decrypts an AES-256-GCM ciphertext produced by the main Next.js app.
 * Format: iv_hex:tag_hex:encrypted_hex
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid ciphertext format — expected iv:tag:data");
  const [ivHex, tagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
}
