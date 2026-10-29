import { describe, expect, it } from "vitest";

import {
  hashPassword,
  verifyLoginPassword,
  verifyPassword,
} from "../../../src/server/auth/password";

describe("password hashing", () => {
  // @tier durable
  it("uses Argon2id and verifies only the original password", async () => {
    const password = "synthetic-password-not-for-production";
    const encoded = await hashPassword(password);

    expect(encoded.startsWith("$argon2id$")).toBe(true);
    expect(encoded).not.toContain(password);
    expect(await verifyPassword(encoded, password)).toBe(true);
    expect(await verifyPassword(encoded, `${password}-wrong`)).toBe(false);
  });

  // @tier durable
  it("fails closed for malformed and absent password hashes", async () => {
    expect(await verifyPassword("not-an-argon2-hash", "secret")).toBe(false);
    expect(await verifyLoginPassword(null, "secret")).toBe(false);
  });
});
