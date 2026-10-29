import { describe, expect, it } from "vitest";

import {
  createOpaqueToken,
  hashToken,
  isOpaqueToken,
  tokenMatchesHash,
} from "../../../src/server/auth/tokens";

describe("opaque authentication tokens", () => {
  // @tier durable
  it("generates unique opaque tokens and stores only their hashes", () => {
    const tokens = new Set(Array.from({ length: 20 }, createOpaqueToken));

    expect(tokens.size).toBe(20);
    for (const token of tokens) {
      const hash = hashToken(token);
      expect(isOpaqueToken(token)).toBe(true);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(hash).not.toContain(token);
      expect(tokenMatchesHash(token, hash)).toBe(true);
      expect(tokenMatchesHash(createOpaqueToken(), hash)).toBe(false);
    }
  });

  // @tier durable
  it("rejects malformed or ambiguous token material", () => {
    expect(isOpaqueToken("")).toBe(false);
    expect(isOpaqueToken("a".repeat(43))).toBe(true);
    expect(isOpaqueToken("a".repeat(42))).toBe(false);
    expect(isOpaqueToken(`${"a".repeat(42)}+`)).toBe(false);
    expect(tokenMatchesHash("a".repeat(43), "not-a-hash")).toBe(false);
  });
});
