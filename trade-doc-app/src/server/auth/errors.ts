import { randomUUID } from "node:crypto";

import type { FieldError } from "./types";

export type AuthErrorStatus = 400 | 401 | 403 | 422 | 429 | 500;

export class AuthError extends Error {
  constructor(
    readonly status: AuthErrorStatus,
    readonly code: string,
    message: string,
    readonly fieldErrors: FieldError[] = [],
    readonly headers?: HeadersInit,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export function unauthenticated(): AuthError {
  return new AuthError(401, "UNAUTHENTICATED", "登录状态无效或已过期");
}

export function invalidCredentials(): AuthError {
  return new AuthError(401, "INVALID_CREDENTIALS", "用户名或密码错误");
}

export function invalidCsrf(): AuthError {
  return new AuthError(403, "CSRF_INVALID", "CSRF 令牌无效");
}

export function forbiddenRole(): AuthError {
  return new AuthError(403, "FORBIDDEN_ROLE", "当前岗位无权执行此操作");
}

export function authErrorResponse(error: unknown): Response {
  const authError =
    error instanceof AuthError
      ? error
      : new AuthError(500, "INTERNAL_ERROR", "服务器处理请求失败");
  const headers = new Headers(authError.headers);
  headers.set("Cache-Control", "no-store");

  return Response.json(
    {
      status: authError.status,
      code: authError.code,
      message: authError.message,
      requestId: randomUUID(),
      fieldErrors: authError.fieldErrors,
    },
    { status: authError.status, headers },
  );
}
