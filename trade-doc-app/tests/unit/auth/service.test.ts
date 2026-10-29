import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSessionContext: vi.fn(),
  requireCsrf: vi.fn(),
  findUserByLoginKey: vi.fn(),
  findUserById: vi.fn(),
  findSessionById: vi.fn(),
  findValidSessionByToken: vi.fn(),
  verifyLoginPassword: vi.fn(),
  withTransaction: vi.fn(),
  transactionUpdate: vi.fn(),
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
}));

vi.mock("../../../src/server/db", async () => {
  const schema = await import("../../../src/server/db/schema");
  return {
    db: { insert: vi.fn(), update: vi.fn() },
    schema,
    withTransaction: mocks.withTransaction,
  };
});

vi.mock("../../../src/server/auth/session", () => ({
  requireSessionContext: mocks.requireSessionContext,
  requireCsrf: mocks.requireCsrf,
  findUserByLoginKey: mocks.findUserByLoginKey,
  findUserById: mocks.findUserById,
  findSessionById: mocks.findSessionById,
  findValidSessionByToken: mocks.findValidSessionByToken,
}));

vi.mock("../../../src/server/auth/password", () => ({
  verifyLoginPassword: mocks.verifyLoginPassword,
}));

vi.mock("../../../src/server/auth/rate-limit", () => ({
  consumeLoginAttempt: vi.fn(() => ({ allowed: true, retryAfterSeconds: 0 })),
}));

import { login, logout } from "../../../src/server/auth/service";
import { createOpaqueToken, hashToken } from "../../../src/server/auth/tokens";
import type { SessionContext } from "../../../src/server/auth/types";

const oldSessionToken = createOpaqueToken();
const csrfToken = createOpaqueToken();
const userRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  loginKey: "sales-a",
  displayName: "Synthetic Sales A",
  passwordHash: "encoded-password-hash",
  roleCode: "sales" as const,
  enabled: true,
  authVersion: 7,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  rowVersion: 1,
};
const anonymousContext: SessionContext = {
  sessionId: "22222222-2222-4222-8222-222222222222",
  sessionKeyHash: hashToken(oldSessionToken),
  csrfTokenHash: hashToken(csrfToken),
  authVersion: null,
  user: null,
};
const anonymousSession = {
  id: anonymousContext.sessionId,
  sessionKeyHash: anonymousContext.sessionKeyHash,
  userId: null,
  authVersion: null,
  csrfTokenHash: anonymousContext.csrfTokenHash,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  expiresAt: new Date("2099-01-01T00:00:00.000Z"),
  lastSeenAt: new Date("2026-01-01T00:00:00.000Z"),
  revokedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireSessionContext.mockResolvedValue(anonymousContext);
  mocks.findUserByLoginKey.mockResolvedValue(userRecord);
  mocks.findUserById.mockResolvedValue(userRecord);
  mocks.findSessionById.mockResolvedValue(anonymousSession);
  mocks.verifyLoginPassword.mockResolvedValue(true);
  mocks.updateSet.mockReturnValue({ where: mocks.updateWhere });
  mocks.transactionUpdate.mockReturnValue({ set: mocks.updateSet });
  const transaction = { update: mocks.transactionUpdate };
  mocks.withTransaction.mockImplementation(
    (callback: (tx: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
  );
});

describe("login service", () => {
  // @tier durable
  it("rotates the session and CSRF hashes only after rechecking the user", async () => {
    const result = await login(new Request("http://localhost/api/v1/auth/login"), {
      username: "sales-a",
      loginKey: "sales-a",
      password: "synthetic-secret",
    });

    expect(mocks.findUserById).toHaveBeenCalledWith(
      userRecord.id,
      expect.anything(),
      true,
    );
    expect(mocks.findSessionById).toHaveBeenCalledWith(
      anonymousContext.sessionId,
      expect.anything(),
      true,
    );
    const update = mocks.updateSet.mock.calls[0]?.[0];
    const cookieToken = /TRADE_SESSION=([^;]+)/.exec(result.setCookie)?.[1];
    expect(update.userId).toBe(userRecord.id);
    expect(update.authVersion).toBe(userRecord.authVersion);
    expect(update.sessionKeyHash).not.toBe(anonymousContext.sessionKeyHash);
    expect(update.csrfTokenHash).not.toBe(anonymousContext.csrfTokenHash);
    expect(update.sessionKeyHash).toBe(hashToken(cookieToken!));
    expect(result.setCookie).not.toContain(update.csrfTokenHash);
    expect(result.user).not.toHaveProperty("passwordHash");
  });

  // @tier durable
  it.each([
    ["unknown account", null, true],
    ["disabled account", { ...userRecord, enabled: false }, true],
    ["wrong password", userRecord, false],
  ])(
    "returns the same credentials error for %s",
    async (_name, candidate, passwordValid) => {
      mocks.findUserByLoginKey.mockResolvedValue(candidate);
      mocks.verifyLoginPassword.mockResolvedValue(passwordValid);

      const error = await login(new Request("http://localhost/api/v1/auth/login"), {
        username: "sales-a",
        loginKey: "sales-a",
        password: "synthetic-secret",
      }).catch((reason: unknown) => reason);

      expect(error).toMatchObject({
        status: 401,
        code: "INVALID_CREDENTIALS",
        message: "用户名或密码错误",
      });
      expect(mocks.withTransaction).not.toHaveBeenCalled();
    },
  );
});

describe("logout service", () => {
  // @tier durable
  it("revokes the server-side session instead of only clearing the cookie", async () => {
    const authenticatedContext: SessionContext = {
      ...anonymousContext,
      authVersion: userRecord.authVersion,
      user: {
        id: userRecord.id,
        username: userRecord.loginKey,
        displayName: userRecord.displayName,
        role: userRecord.roleCode,
      },
    };
    mocks.requireSessionContext.mockResolvedValue(authenticatedContext);
    mocks.findSessionById.mockResolvedValue({
      ...anonymousSession,
      userId: userRecord.id,
      authVersion: userRecord.authVersion,
    });

    const cookie = await logout(
      new Request("http://localhost/api/v1/auth/logout", { method: "POST" }),
    );

    expect(mocks.updateSet).toHaveBeenCalledWith({
      revokedAt: expect.any(Date),
      lastSeenAt: expect.any(Date),
    });
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("Path=/api/v1");
  });
});
