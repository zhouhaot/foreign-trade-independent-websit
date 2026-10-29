import { eq } from "drizzle-orm";

import { db, schema, withTransaction } from "../db";

import {
  AuthError,
  invalidCredentials,
  invalidCsrf,
  unauthenticated,
} from "./errors";
import {
  clearSessionCookie,
  readSessionCookie,
  sessionCookie,
} from "./http";
import { verifyLoginPassword } from "./password";
import { consumeLoginAttempt } from "./rate-limit";
import {
  findSessionById,
  findUserById,
  findUserByLoginKey,
  findValidSessionByToken,
  requireCsrf,
  requireSessionContext,
} from "./session";
import { createOpaqueToken, hashToken } from "./tokens";
import type { AuthUser } from "./types";
import type { LoginInput } from "./validation";

function sessionTtlSeconds(): number {
  const raw = process.env.AUTH_SESSION_TTL_SECONDS;
  if (raw === undefined) {
    return 8 * 60 * 60;
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 60) {
    throw new Error("AUTH_SESSION_TTL_SECONDS must be an integer of at least 60");
  }
  return value;
}

export async function issueCsrf(request: Request): Promise<{
  token: string;
  setCookie: string | null;
}> {
  const sessionToken = readSessionCookie(request);
  const existing = sessionToken
    ? await findValidSessionByToken(sessionToken)
    : null;
  const csrfToken = createOpaqueToken();
  const csrfTokenHash = hashToken(csrfToken);

  if (existing) {
    await db
      .update(schema.userSession)
      .set({ csrfTokenHash })
      .where(eq(schema.userSession.id, existing.sessionId));
    return { token: csrfToken, setCookie: null };
  }

  const ttlSeconds = sessionTtlSeconds();
  const now = new Date();
  const rawSessionToken = createOpaqueToken();
  await db.insert(schema.userSession).values({
    sessionKeyHash: hashToken(rawSessionToken),
    userId: null,
    authVersion: null,
    csrfTokenHash,
    createdAt: now,
    expiresAt: new Date(now.getTime() + ttlSeconds * 1000),
    lastSeenAt: now,
    revokedAt: null,
  });
  return {
    token: csrfToken,
    setCookie: sessionCookie(rawSessionToken, ttlSeconds),
  };
}

export async function login(
  request: Request,
  input: LoginInput,
): Promise<{ user: AuthUser; setCookie: string }> {
  const context = await requireSessionContext(request, false);
  requireCsrf(request, context);

  const rateLimit = consumeLoginAttempt(request, input.loginKey);
  if (!rateLimit.allowed) {
    throw new AuthError(429, "RATE_LIMITED", "登录尝试过于频繁", [], {
      "Retry-After": String(rateLimit.retryAfterSeconds),
    });
  }

  const candidate = await findUserByLoginKey(input.loginKey);
  const passwordValid = await verifyLoginPassword(
    candidate?.passwordHash ?? null,
    input.password,
  );
  if (!candidate || !candidate.enabled || !passwordValid) {
    throw invalidCredentials();
  }

  const ttlSeconds = sessionTtlSeconds();
  const now = new Date();
  const rawSessionToken = createOpaqueToken();
  const csrfTokenHash = hashToken(createOpaqueToken());
  const sessionTokenHash = hashToken(rawSessionToken);

  const user = await withTransaction(async (transaction) => {
    const lockedUser = await findUserById(candidate.id, transaction, true);
    if (
      !lockedUser ||
      !lockedUser.enabled ||
      lockedUser.authVersion !== candidate.authVersion ||
      lockedUser.passwordHash !== candidate.passwordHash
    ) {
      throw invalidCredentials();
    }

    const lockedSession = await findSessionById(
      context.sessionId,
      transaction,
      true,
    );
    if (
      !lockedSession ||
      lockedSession.revokedAt !== null ||
      lockedSession.expiresAt.getTime() <= now.getTime() ||
      lockedSession.sessionKeyHash !== context.sessionKeyHash ||
      lockedSession.csrfTokenHash !== context.csrfTokenHash ||
      lockedSession.userId !== (context.user?.id ?? null) ||
      lockedSession.authVersion !== context.authVersion
    ) {
      throw invalidCsrf();
    }

    await transaction
      .update(schema.userSession)
      .set({
        sessionKeyHash: sessionTokenHash,
        userId: lockedUser.id,
        authVersion: lockedUser.authVersion,
        csrfTokenHash,
        expiresAt: new Date(now.getTime() + ttlSeconds * 1000),
        lastSeenAt: now,
        revokedAt: null,
      })
      .where(eq(schema.userSession.id, lockedSession.id));

    return {
      id: lockedUser.id,
      username: lockedUser.loginKey,
      displayName: lockedUser.displayName,
      role: lockedUser.roleCode,
    };
  });

  return { user, setCookie: sessionCookie(rawSessionToken, ttlSeconds) };
}

export async function logout(request: Request): Promise<string> {
  const context = await requireSessionContext(request, true);
  requireCsrf(request, context);
  if (!context.user) {
    throw unauthenticated();
  }

  const now = new Date();
  await withTransaction(async (transaction) => {
    const user = await findUserById(context.user!.id, transaction, true);
    if (!user || !user.enabled) {
      throw unauthenticated();
    }

    const session = await findSessionById(
      context.sessionId,
      transaction,
      true,
    );
    if (
      !session ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= now.getTime() ||
      session.sessionKeyHash !== context.sessionKeyHash ||
      session.csrfTokenHash !== context.csrfTokenHash ||
      session.userId !== user.id ||
      session.authVersion !== user.authVersion
    ) {
      throw unauthenticated();
    }

    await transaction
      .update(schema.userSession)
      .set({ revokedAt: now, lastSeenAt: now })
      .where(eq(schema.userSession.id, session.id));
  });

  return clearSessionCookie();
}
