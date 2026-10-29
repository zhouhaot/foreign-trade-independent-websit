import { z } from "zod";

import { malformedRequest, validationError, type FieldError } from "./errors";

function escapePointerSegment(segment: string): string {
  return segment.replaceAll("~", "~0").replaceAll("/", "~1");
}

function issuePath(path: readonly PropertyKey[]): string {
  if (path.length === 0) {
    return "/";
  }
  return `/${path.map((segment) => escapePointerSegment(String(segment))).join("/")}`;
}

function toFieldErrors(error: z.ZodError): FieldError[] {
  return error.issues.slice(0, 100).map((issue) => ({
    path: issuePath(issue.path),
    code: issue.code,
    message:
      issue.code === "unrecognized_keys"
        ? "存在未知字段"
        : issue.code === "invalid_type"
          ? "字段类型不正确"
          : "字段值不合法",
  }));
}

export function strictDto<T extends z.ZodRawShape>(shape: T) {
  return z.strictObject(shape);
}

export function parseDto<S extends z.ZodType>(
  schema: S,
  input: unknown,
): z.output<S> {
  const result = schema.safeParse(input);
  if (result.success) {
    return result.data;
  }

  const fieldErrors = toFieldErrors(result.error);
  if (
    result.error.issues.some(
      (issue) =>
        issue.code === "unrecognized_keys" || issue.code === "invalid_type",
    )
  ) {
    throw malformedRequest("请求类型或字段结构不正确", fieldErrors);
  }
  throw validationError("请求字段不合法", fieldErrors);
}

export async function readJsonDto<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.output<S>> {
  const mediaType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (mediaType !== "application/json") {
    throw malformedRequest("请求体必须使用 application/json");
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    throw malformedRequest("请求体不是合法 JSON");
  }
  return parseDto(schema, input);
}
