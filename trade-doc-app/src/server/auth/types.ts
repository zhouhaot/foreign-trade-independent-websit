export const roles = ["admin", "sales", "doc", "fin", "boss"] as const;

export type Role = (typeof roles)[number];

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
}

export interface AuthIdentity {
  sessionId: string;
  user: AuthUser;
}

export interface SessionContext {
  sessionId: string;
  sessionKeyHash: string;
  csrfTokenHash: string;
  authVersion: number | null;
  user: AuthUser | null;
}

export interface FieldError {
  path: string;
  code: string;
  message: string;
}
