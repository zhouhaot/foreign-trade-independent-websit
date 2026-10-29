export type ApiErrorStatus = 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500;

export interface FieldError {
  path: string;
  code: string;
  message: string;
}

export interface ApiErrorOptions {
  fieldErrors?: readonly FieldError[];
  currentVersion?: number;
  headers?: HeadersInit;
}

export class ApiError extends Error {
  readonly status: ApiErrorStatus;
  readonly code: string;
  readonly fieldErrors: readonly FieldError[];
  readonly currentVersion: number | undefined;
  readonly headers: HeadersInit | undefined;

  constructor(
    status: ApiErrorStatus,
    code: string,
    message: string,
    options: ApiErrorOptions = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = options.fieldErrors ?? [];
    this.currentVersion = options.currentVersion;
    this.headers = options.headers;
  }
}

export function malformedRequest(
  message = "请求格式不正确",
  fieldErrors: readonly FieldError[] = [],
): ApiError {
  return new ApiError(400, "MALFORMED_REQUEST", message, { fieldErrors });
}

export function validationError(
  message = "请求字段不合法",
  fieldErrors: readonly FieldError[] = [],
): ApiError {
  return new ApiError(422, "VALIDATION_ERROR", message, { fieldErrors });
}

export function errorResponse(error: unknown, requestId: string): Response {
  const apiError =
    error instanceof ApiError
      ? error
      : new ApiError(500, "INTERNAL_ERROR", "服务器暂时无法处理请求");
  const headers = new Headers(apiError.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Request-Id", requestId);

  return Response.json(
    {
      status: apiError.status,
      code: apiError.code,
      message: apiError.message,
      requestId,
      fieldErrors: apiError.fieldErrors.slice(0, 100),
      ...(apiError.currentVersion === undefined
        ? {}
        : { currentVersion: apiError.currentVersion }),
    },
    { status: apiError.status, headers },
  );
}
