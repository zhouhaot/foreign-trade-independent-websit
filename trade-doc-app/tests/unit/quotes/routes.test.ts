import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorizeRequest: vi.fn(),
  createQuote: vi.fn(),
}));

vi.mock("../../../src/server/auth", async () => {
  const { authErrorResponse } = await import("../../../src/server/auth/errors");
  return { authorizeRequest: mocks.authorizeRequest, authErrorResponse };
});

vi.mock("../../../src/server/modules/quotes", async () => {
  const { quoteCreateSchema } = await import("../../../src/server/modules/quotes/dto");
  return { createQuote: mocks.createQuote, quoteCreateSchema };
});

import { invalidCsrf } from "../../../src/server/auth/errors";
import { POST } from "../../../src/app/api/v1/inquiries/[id]/quotes/route";

const inquiryId = "00000000-0000-4000-8000-000000000202";
const quoteId = "00000000-0000-4000-8000-000000000204";
const idempotencyKey = "00000000-0000-4000-8000-000000000301";
const identity = {
  sessionId: "00000000-0000-4000-8000-000000000302",
  user: {
    id: "00000000-0000-4000-8000-000000000002",
    username: "synthetic-sales-a",
    displayName: "Synthetic Sales A",
    role: "sales" as const,
  },
};
const body = { expectedVersion: 1, currency: "USD" };

function request(payload: unknown = body, withIdempotencyKey = true) {
  return new Request(`http://localhost/api/v1/inquiries/${inquiryId}/quotes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": "synthetic-csrf-token",
      ...(withIdempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(payload),
  });
}

function call(routeRequest: Request) {
  return POST(routeRequest, { params: Promise.resolve({ id: inquiryId }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authorizeRequest.mockResolvedValue(identity);
  mocks.createQuote.mockResolvedValue({
    data: { id: quoteId },
    status: 201,
    replayed: false,
  });
});

describe("POST /api/v1/inquiries/:id/quotes", () => {
  it("authorizes CSRF and forwards one idempotent command with no-store", async () => {
    // @tier durable
    const response = await call(request());
    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.authorizeRequest).toHaveBeenCalledWith(expect.any(Request), {
      roles: ["sales"],
      csrf: true,
    });
    expect(mocks.createQuote).toHaveBeenCalledWith(
      identity,
      inquiryId,
      body,
      expect.objectContaining({ idempotencyKey }),
    );
  });

  it("requires an idempotency key before business work", async () => {
    // @tier durable
    const response = await call(request(body, false));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "MALFORMED_REQUEST" });
    expect(mocks.createQuote).not.toHaveBeenCalled();
  });

  it("rejects unknown source or ownership fields", async () => {
    // @tier durable
    const response = await call(request({ ...body, customerId: crypto.randomUUID() }));
    expect(response.status).toBe(400);
    expect(mocks.createQuote).not.toHaveBeenCalled();
  });

  it("does not turn CSRF failures into internal errors", async () => {
    // @tier durable
    mocks.authorizeRequest.mockRejectedValue(invalidCsrf());
    const response = await call(request());
    expect(response.status).toBe(403);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ code: "CSRF_INVALID" });
    expect(mocks.createQuote).not.toHaveBeenCalled();
  });
});
