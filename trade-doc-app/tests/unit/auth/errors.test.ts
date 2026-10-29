import { describe, expect, it } from "vitest";

import {
  AuthError,
  authErrorResponse,
  invalidCredentials,
} from "../../../src/server/auth/errors";

describe("authentication error responses", () => {
  // @tier durable
  it("uses a stable error shape without caching or stack traces", async () => {
    const response = authErrorResponse(invalidCredentials());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toEqual({
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "用户名或密码错误",
      requestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      fieldErrors: [],
    });
    expect(JSON.stringify(body)).not.toContain("stack");
  });

  // @tier durable
  it("preserves rate-limit retry headers and hides unexpected failures", async () => {
    const limited = authErrorResponse(
      new AuthError(429, "RATE_LIMITED", "请求过于频繁", [], {
        "Retry-After": "30",
      }),
    );
    expect(limited.headers.get("Retry-After")).toBe("30");

    const internal = authErrorResponse(new Error("sensitive database detail"));
    expect(internal.status).toBe(500);
    expect(internal.headers.get("Cache-Control")).toBe("no-store");
    expect(JSON.stringify(await internal.json())).not.toContain(
      "sensitive database detail",
    );
  });
});
