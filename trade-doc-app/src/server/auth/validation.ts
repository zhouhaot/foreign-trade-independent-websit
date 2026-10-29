import { z } from "zod";

import { AuthError } from "./errors";
import type { FieldError } from "./types";

const loginRequestSchema = z
  .object({
    username: z.string().min(1).max(100),
    password: z.string().min(1).max(256),
  })
  .strict();

export interface LoginInput {
  username: string;
  password: string;
  loginKey: string;
}

export function normalizeLoginKey(username: string): string {
  return username.trim().toLowerCase();
}

export async function parseLoginRequest(request: Request): Promise<LoginInput> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0];
  if (contentType?.trim().toLowerCase() !== "application/json") {
    throw malformedRequest("请求必须使用 application/json");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw malformedRequest("请求 JSON 格式错误");
  }

  const result = loginRequestSchema.safeParse(body);
  if (!result.success) {
    const fieldErrors = result.error.issues.map((issue) => ({
      path: `/${issue.path.join("/")}`,
      code: issue.code,
      message: "登录字段不符合要求",
    }));
    const malformed = result.error.issues.some(
      (issue) =>
        issue.code === "invalid_type" || issue.code === "unrecognized_keys",
    );
    throw new AuthError(
      malformed ? 400 : 422,
      malformed ? "MALFORMED_REQUEST" : "VALIDATION_ERROR",
      malformed ? "登录请求格式错误" : "登录字段不符合要求",
      fieldErrors,
    );
  }

  const loginKey = normalizeLoginKey(result.data.username);
  if (!loginKey) {
    const fieldErrors: FieldError[] = [
      { path: "/username", code: "too_small", message: "用户名不能为空" },
    ];
    throw new AuthError(
      422,
      "VALIDATION_ERROR",
      "登录字段不符合要求",
      fieldErrors,
    );
  }

  return { ...result.data, loginKey };
}

function malformedRequest(message: string): AuthError {
  return new AuthError(400, "MALFORMED_REQUEST", message);
}
