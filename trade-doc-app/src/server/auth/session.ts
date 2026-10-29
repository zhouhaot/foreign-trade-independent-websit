import { eq } from "drizzle-orm";

import { db, schema } from "../db";

import { forbiddenRole, invalidCsrf, unauthenticated } from "./errors";
import { CSRF_HEADER, readSessionCookie } from "./http";
import { hashToken, tokenMatchesHash } from "./tokens";
import type { AuthIdentity, AuthUser, Role, SessionContext } from "./types";

export type AuthDatabase = Pick<typeof db, "select" | "insert" | "update">;
type UserRecord = typeof schema.appUser.$inferSelect;
type SessionRecord = typeof schema.userSession.$inferSelect;

export async function findUserByLoginKey(
  loginKey: string,
  database: AuthDatabase = db,
): Promise<UserRecord | null> {
  const users = await database
    .select()
    .from(schema.appUser)
    .where(eq(schema.appUser.loginKey, loginKey))
    .limit(1);
  return users[0] ?? null;
}

export async function findUserById(
  id: string,
  database: AuthDatabase = db,
  lock = false,
): Promise<UserRecord | null> {
  const query = database
    .select()
    .from(schema.appUser)
    .where(eq(schema.appUser.id, id))
    .limit(1);
  const users = await (lock ? query.for("update") : query);
  return users[0] ?? null;
}

export async function findSessionById(
  id: string,
  database: AuthDatabase = db,
  lock = false,
): Promise<SessionRecord | null> {
  const query = database
    .select()
    .from(schema.userSession)
    .where(eq(schema.userSession.id, id))
    .limit(1);
  const sessions = await (lock ? query.for("update") : query);
  return sessions[0] ?? null;
}

function toAuthUser(user: UserRecord): AuthUser {
  return {
    id: user.id,
    username: user.loginKey,
    displayName: user.displayName,
    role: user.roleCode,
  };
}

async function contextFromSession(
  session: SessionRecord,
  database: AuthDatabase,
  now: Date,
): Promise<SessionContext | null> {
  if (session.revokedAt !== null || session.expiresAt.getTime() <= now.getTime()) {
    return null;
  }

  if (session.userId === null || session.authVersion === null) {
    if (session.userId !== null || session.authVersion !== null) {
      return null;
    }
    return {
      sessionId: session.id,
      sessionKeyHash: session.sessionKeyHash,
      csrfTokenHash: session.csrfTokenHash,
      authVersion: null,
      user: null,
    };
  }

  const user = await findUserById(session.userId, database);
  if (
    !user ||
    !user.enabled ||
    user.authVersion !== session.authVersion
  ) {
    return null;
  }

  return {
    sessionId: session.id,
    sessionKeyHash: session.sessionKeyHash,
    csrfTokenHash: session.csrfTokenHash,
    authVersion: session.authVersion,
    user: toAuthUser(user),
  };
}

export async function findValidSessionByToken(
  token: string,
  database: AuthDatabase = db,
  now = new Date(),
): Promise<SessionContext | null> {
  const sessions = await database
    .select()
    .from(schema.userSession)
    .where(eq(schema.userSession.sessionKeyHash, hashToken(token)))
    .limit(1);
  const session = sessions[0];
  return session ? contextFromSession(session, database, now) : null;
}

export async function requireSessionContext(
  request: Request,
  authenticated: boolean,
): Promise<SessionContext> {
  const token = readSessionCookie(request);
  const context = token ? await findValidSessionByToken(token) : null;
  if (!context || (authenticated && !context.user)) {
    throw authenticated ? unauthenticated() : invalidCsrf();
  }
  return context;
}

export function requireCsrf(
  request: Request,
  context: SessionContext,
): void {
  const token = request.headers.get(CSRF_HEADER);
  if (!token || !tokenMatchesHash(token, context.csrfTokenHash)) {
    throw invalidCsrf();
  }
}

export async function getCurrentIdentity(
  request: Request,
): Promise<AuthIdentity> {
  const context = await requireSessionContext(request, true);
  if (!context.user) {
    throw unauthenticated();
  }
  return { sessionId: context.sessionId, user: context.user };
}

export function requireRole(
  identity: AuthIdentity,
  allowedRoles: readonly Role[],
): AuthIdentity {
  if (!allowedRoles.includes(identity.user.role)) {
    throw forbiddenRole();
  }
  return identity;
}

export async function authorizeRequest(
  request: Request,
  options: { roles: readonly Role[]; csrf?: boolean },
): Promise<AuthIdentity> {
  const context = await requireSessionContext(request, true);
  if (!context.user) {
    throw unauthenticated();
  }
  const identity = { sessionId: context.sessionId, user: context.user };
  requireRole(identity, options.roles);
  if (options.csrf) {
    requireCsrf(request, context);
  }
  return identity;
}
