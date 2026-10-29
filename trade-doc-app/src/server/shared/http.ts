import { randomUUID } from "node:crypto";

import { z } from "zod";

import { errorResponse, malformedRequest, type FieldError } from "./errors";

const uuidSchema = z.uuid();
const INTEGER_PATTERN = /^[1-9][0-9]*$/;

export interface Pagination {
  page: number;
  pageSize: number;
  offset: number;
  q: string;
}

export interface JsonResponseOptions {
  status?: number;
  requestId: string;
  replayed?: boolean;
  headers?: HeadersInit;
}

export function createRequestId(): string {
  return randomUUID();
}

export function jsonResponse<T>(
  data: T,
  options: JsonResponseOptions,
): Response {
  const headers = new Headers(options.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Request-Id", options.requestId);
  if (options.replayed === true) {
    headers.set("Idempotency-Replayed", "true");
  }
  return Response.json(data, { status: options.status ?? 200, headers });
}

export async function handleApi(
  handler: (requestId: string) => Response | Promise<Response>,
): Promise<Response> {
  const requestId = createRequestId();
  try {
    const response = await handler(requestId);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Request-Id", requestId);
    return response;
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

function parseUuid(value: string, path: string): string {
  const result = uuidSchema.safeParse(value);
  if (!result.success) {
    const fieldErrors: FieldError[] = [
      { path, code: "invalid_format", message: "必须使用合法 UUID" },
    ];
    throw malformedRequest("ID 或幂等键格式不正确", fieldErrors);
  }
  return value.toLowerCase();
}

export function parseResourceId(value: string): string {
  return parseUuid(value, "/id");
}

export function parseIdempotencyKey(headers: Headers): string {
  const value = headers.get("idempotency-key");
  if (value === null) {
    throw malformedRequest("缺少 Idempotency-Key", [
      {
        path: "/Idempotency-Key",
        code: "required",
        message: "业务写请求必须提供幂等键",
      },
    ]);
  }
  return parseUuid(value, "/Idempotency-Key");
}

function parsePageInteger(
  searchParams: URLSearchParams,
  name: "page" | "pageSize",
  defaultValue: number,
  maximum: number,
): number {
  const values = searchParams.getAll(name);
  if (values.length === 0) {
    return defaultValue;
  }
  const value = values[0]!;
  if (
    values.length !== 1 ||
    !INTEGER_PATTERN.test(value) ||
    value.length > String(Number.MAX_SAFE_INTEGER).length
  ) {
    throw malformedRequest("分页参数格式不正确", [
      { path: `/${name}`, code: "invalid_format", message: "必须为正整数" },
    ]);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > maximum) {
    throw malformedRequest("分页参数超出范围", [
      { path: `/${name}`, code: "out_of_range", message: "分页参数超出范围" },
    ]);
  }
  return parsed;
}

export function parsePagination(searchParams: URLSearchParams): Pagination {
  const page = parsePageInteger(
    searchParams,
    "page",
    1,
    Number.MAX_SAFE_INTEGER,
  );
  const pageSize = parsePageInteger(searchParams, "pageSize", 20, 100);
  const offset = (page - 1) * pageSize;
  if (!Number.isSafeInteger(offset)) {
    throw malformedRequest("分页偏移超出范围", [
      { path: "/page", code: "out_of_range", message: "页码过大" },
    ]);
  }
  const queries = searchParams.getAll("q");
  if (queries.length > 1 || (queries[0]?.length ?? 0) > 100) {
    throw malformedRequest("搜索参数格式不正确", [
      { path: "/q", code: "invalid_format", message: "搜索词最多 100 个字符" },
    ]);
  }
  return { page, pageSize, offset, q: queries[0] ?? "" };
}

export function pageResult<T>(
  items: readonly T[],
  pagination: Pagination,
  total: number,
) {
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new TypeError("total must be a non-negative safe integer");
  }
  return {
    items,
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    totalPages: Math.ceil(total / pagination.pageSize),
  };
}
