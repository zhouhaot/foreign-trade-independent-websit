import { isOpaqueToken } from "./tokens";

export const SESSION_COOKIE = "TRADE_SESSION";
export const SESSION_COOKIE_PATH = "/api/v1";
export const CSRF_HEADER = "x-csrf-token";

export function readSessionCookie(request: Request): string | null {
  const values = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${SESSION_COOKIE}=`))
    .map((part) => part.slice(SESSION_COOKIE.length + 1));

  if (!values || values.length !== 1) {
    return null;
  }

  const token = values[0] ?? "";
  return isOpaqueToken(token) ? token : null;
}

export function sessionCookie(token: string, maxAgeSeconds: number): string {
  return `${SESSION_COOKIE}=${token}; Path=${SESSION_COOKIE_PATH}; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=${SESSION_COOKIE_PATH}; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function noStore(response: Response): Response {
  response.headers.set("Cache-Control", "no-store");
  return response;
}
