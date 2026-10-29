import type { ErrorBody, Session } from "./contracts";

const API_ROOT = "/api/v1";
const UNAUTHORIZED_EVENT = "trade:unauthorized";
let csrfToken: string | null = null;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string;
  readonly fieldErrors: ErrorBody["fieldErrors"];
  readonly currentVersion?: number;
  readonly retryAfter?: string;

  constructor(body: ErrorBody, retryAfter?: string) {
    super(body.message);
    this.name = "ApiError";
    this.status = body.status;
    this.code = body.code;
    this.requestId = body.requestId;
    this.fieldErrors = body.fieldErrors;
    if (body.currentVersion !== undefined) this.currentVersion = body.currentVersion;
    if (retryAfter !== undefined) this.retryAfter = retryAfter;
  }
}

function fallbackError(status: number): ErrorBody {
  return {
    status,
    code: "REQUEST_FAILED",
    message: status >= 500 ? "服务暂时不可用，请稍后重试。" : "请求未完成，请检查后重试。",
    requestId: "未提供",
    fieldErrors: [],
  };
}

async function parseError(response: Response): Promise<ApiError> {
  let body: ErrorBody;
  try {
    const value = (await response.json()) as Partial<ErrorBody>;
    body = {
      ...fallbackError(response.status),
      ...value,
      status: response.status,
      fieldErrors: Array.isArray(value.fieldErrors) ? value.fieldErrors : [],
    };
  } catch {
    body = fallbackError(response.status);
  }
  return new ApiError(body, response.headers.get("Retry-After") ?? undefined);
}

export async function getCsrf(force = false): Promise<string> {
  if (csrfToken && !force) return csrfToken;
  const response = await fetch(`${API_ROOT}/auth/csrf`, {
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw await parseError(response);
  const body = (await response.json()) as { token: string };
  csrfToken = body.token;
  return body.token;
}

export function clearCsrf() {
  csrfToken = null;
}

type ApiOptions = {
  method?: "GET" | "POST" | "PUT";
  body?: unknown;
  idempotencyKey?: string;
  signal?: AbortSignal;
  reportUnauthorized?: boolean;
};

export async function api<T>(path: string, options: ApiOptions = {}, retriedCsrf = false): Promise<T> {
  const method = options.method ?? "GET";
  const isWrite = method !== "GET";
  const headers = new Headers({ Accept: "application/json" });
  if (isWrite) {
    headers.set("Content-Type", "application/json");
    headers.set("X-CSRF-TOKEN", await getCsrf());
  }
  if (options.idempotencyKey) headers.set("Idempotency-Key", options.idempotencyKey);

  let response: Response;
  try {
    response = await fetch(`${API_ROOT}${path}`, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers,
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      ...(options.signal === undefined ? {} : { signal: options.signal }),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "无法连接服务，请检查网络后重试。",
      requestId: "未提供",
      fieldErrors: [],
    });
  }

  if (!response.ok) {
    const error = await parseError(response);
    if (error.status === 403 && error.code === "CSRF_INVALID" && isWrite && !retriedCsrf) {
      await getCsrf(true);
      return api<T>(path, options, true);
    }
    if (error.status === 401 && options.reportUnauthorized !== false && typeof window !== "undefined") {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw error;
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function login(username: string, password: string): Promise<Session> {
  const session = await api<Session>("/auth/login", {
    method: "POST",
    body: { username, password },
    reportUnauthorized: false,
  });
  await getCsrf(true);
  return session;
}

export async function logout(): Promise<void> {
  await api<void>("/auth/logout", { method: "POST" });
  clearCsrf();
}

export function onUnauthorized(listener: () => void) {
  window.addEventListener(UNAUTHORIZED_EVENT, listener);
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, listener);
}
