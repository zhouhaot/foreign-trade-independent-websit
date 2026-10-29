import { describe, expect, it } from "vitest";

import { invalidCsrf } from "../../../src/server/auth/errors";
import { handleInquiryRequest } from "../../../src/server/modules/inquiries/http";
import { ApiError } from "../../../src/server/shared";

describe("inquiry HTTP error boundary", () => {
  it("preserves authentication errors and disables caching", async () => {
    const response = await handleInquiryRequest(() => {
      throw invalidCsrf();
    });
    expect(response.status).toBe(403);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ code: "CSRF_INVALID", status: 403 });
  });

  it("returns stable API errors with a request ID", async () => {
    const response = await handleInquiryRequest(() => {
      throw new ApiError(404, "NOT_FOUND", "询盘不存在或无权访问");
    });
    expect(response.status).toBe(404);
    expect(response.headers.get("X-Request-Id")).toBeTruthy();
    expect(await response.json()).toMatchObject({
      code: "NOT_FOUND",
      fieldErrors: [],
    });
  });
});
