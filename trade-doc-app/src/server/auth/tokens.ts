import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isOpaqueToken(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}

export function tokenMatchesHash(token: string, expectedHash: string): boolean {
  if (!isOpaqueToken(token) || !/^[a-f0-9]{64}$/.test(expectedHash)) {
    return false;
  }

  const actual = Buffer.from(hashToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return timingSafeEqual(actual, expected);
}
