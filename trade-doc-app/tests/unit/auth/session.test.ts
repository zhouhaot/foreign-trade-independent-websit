import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/server/db", async () => {
  const schema = await import("../../../src/server/db/schema");
  return { db: {}, schema };
});

import {
  findValidSessionByToken,
  requireCsrf,
  requireRole,
  type AuthDatabase,
} from "../../../src/server/auth/session";
import { createOpaqueToken, hashToken } from "../../../src/server/auth/tokens";
import type { SessionContext } from "../../../src/server/auth/types";

const now = new Date("2026-01-01T00:00:00.000Z");
const sessionToken = createOpaqueToken();
const csrfToken = createOpaqueToken();

function user(overrides = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    loginKey: "sales-a",
    displayName: "Synthetic Sales A",
    passwordHash: "private-hash",
    roleCode: "sales" as const,
    enabled: true,
    authVersion: 3,
    createdAt: now,
    rowVersion: 1,
    ...overrides,
  };
}

function session(overrides = {}) {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    sessionKeyHash: hashToken(sessionToken),
    userId: user().id,
    authVersion: 3,
    csrfTokenHash: hashToken(csrfToken),
    createdAt: now,
    expiresAt: new Date("2026-01-01T08:00:00.000Z"),
    lastSeenAt: now,
    revokedAt: null,
    ...overrides,
  };
}

function databaseReturning(...results: unknown[][]): AuthDatabase {
  return {
    select: vi.fn(() => {
      const rows = results.shift() ?? [];
      return {
        from: vi.fn(() => ({
          where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue(rows) })),
        })),
      };
    }),
  } as unknown as AuthDatabase;
}

describe("server-side session validity", () => {
  // @tier durable
  it("returns identity only after joining a valid session to its enabled user", async () => {
    const context = await findValidSessionByToken(
      sessionToken,
      databaseReturning([session()], [user()]),
      now,
    );

    expect(context?.user).toEqual({
      id: user().id,
      username: "sales-a",
      displayName: "Synthetic Sales A",
      role: "sales",
    });
    expect(context?.user).not.toHaveProperty("passwordHash");
    expect(context?.authVersion).toBe(3);
  });

  // @tier durable
  it.each([
    ["expired", session({ expiresAt: now }), user()],
    ["revoked", session({ revokedAt: now }), user()],
    ["disabled", session(), user({ enabled: false })],
    ["auth version changed", session(), user({ authVersion: 4 })],
    ["anonymous pair is malformed", session({ authVersion: null }), user()],
  ])("rejects a session that is %s", async (_name, sessionRow, userRow) => {
    await expect(
      findValidSessionByToken(
        sessionToken,
        databaseReturning([sessionRow], [userRow]),
        now,
      ),
    ).resolves.toBeNull();
  });
});

describe("authorization and CSRF helpers", () => {
  const context: SessionContext = {
    sessionId: session().id,
    sessionKeyHash: session().sessionKeyHash,
    csrfTokenHash: session().csrfTokenHash,
    authVersion: 3,
    user: {
      id: user().id,
      username: "sales-a",
      displayName: "Synthetic Sales A",
      role: "sales",
    },
  };

  // @tier durable
  it("allows only explicitly authorized roles", () => {
    const identity = { sessionId: context.sessionId, user: context.user! };

    expect(requireRole(identity, ["sales", "boss"])).toBe(identity);
    expect(() => requireRole(identity, ["boss"])).toThrow(
      expect.objectContaining({ status: 403, code: "FORBIDDEN_ROLE" }),
    );
    expect(() => requireRole(identity, [])).toThrow(
      expect.objectContaining({ status: 403, code: "FORBIDDEN_ROLE" }),
    );
  });

  // @tier durable
  it("accepts only the CSRF token bound to the current session", () => {
    const request = (token?: string) => {
      const headers = new Headers();
      if (token) {
        headers.set("X-CSRF-TOKEN", token);
      }
      return new Request("http://localhost/api/v1/customers", {
        method: "POST",
        headers,
      });
    };

    expect(() => requireCsrf(request(csrfToken), context)).not.toThrow();
    expect(() => requireCsrf(request(createOpaqueToken()), context)).toThrow(
      expect.objectContaining({ status: 403, code: "CSRF_INVALID" }),
    );
    expect(() => requireCsrf(request(), context)).toThrow(
      expect.objectContaining({ status: 403, code: "CSRF_INVALID" }),
    );
  });
});
