import { describe, expect, it } from "vitest";

import {
  ApiError,
  errorResponse,
} from "../../../src/server/shared/errors";
import { handleApi, jsonResponse } from "../../../src/server/shared/http";

describe("API errors", () => {
  it("returns the complete contract error shape without a stack", async () => {
    // @tier durable
    const response = errorResponse(
      new ApiError(409, "VERSION_CONFLICT", "版本已变化", {
        currentVersion: 3,
        fieldErrors: [
          { path: "/expectedVersion", code: "version", message: "版本冲突" },
        ],
      }),
      "request-123",
    );

    expect(response.status).toBe(409);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-request-id")).toBe("request-123");
    expect(await response.json()).toEqual({
      status: 409,
      code: "VERSION_CONFLICT",
      message: "版本已变化",
      requestId: "request-123",
      fieldErrors: [
        { path: "/expectedVersion", code: "version", message: "版本冲突" },
      ],
      currentVersion: 3,
    });
  });

  it("does not expose SQL or stack details from unknown failures", async () => {
    // @tier durable
    const response = errorResponse(
      new Error('duplicate key; SQL: insert into "customer" values (secret)'),
      "request-safe",
    );
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(JSON.parse(text)).toEqual({
      status: 500,
      code: "INTERNAL_ERROR",
      message: "服务器暂时无法处理请求",
      requestId: "request-safe",
      fieldErrors: [],
    });
    expect(text).not.toContain("SQL");
    expect(text).not.toContain("secret");
    expect(text).not.toContain("stack");
  });

  it("adds anti-caching and request correlation to successful responses", async () => {
    // @tier durable
    const response = await handleApi((requestId) =>
      jsonResponse(
        { ok: true },
        { requestId, replayed: true },
      ),
    );

    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("idempotency-replayed")).toBe("true");
    expect(response.headers.get("x-request-id")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
