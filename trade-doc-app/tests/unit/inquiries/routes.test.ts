import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorizeRequest: vi.fn(),
  createInquiry: vi.fn(),
}));

vi.mock("../../../src/server/auth", () => ({
  authorizeRequest: mocks.authorizeRequest,
}));

vi.mock("../../../src/server/modules/inquiries", async () => {
  const [{ handleInquiryRequest }, { inquiryCreateSchema }] = await Promise.all([
    import("../../../src/server/modules/inquiries/http"),
    import("../../../src/server/modules/inquiries/dto"),
  ]);
  return {
    createInquiry: mocks.createInquiry,
    listInquiries: vi.fn(),
    handleInquiryRequest,
    inquiryCreateSchema,
  };
});

import { invalidCsrf } from "../../../src/server/auth/errors";
import { POST } from "../../../src/app/api/v1/inquiries/route";

const identity = {
  sessionId: "00000000-0000-4000-8000-000000000201",
  user: {
    id: "00000000-0000-4000-8000-000000000002",
    username: "synthetic-sales-a",
    displayName: "Synthetic Sales A",
    role: "sales" as const,
  },
};
const idempotencyKey = "00000000-0000-4000-8000-000000000301";
const inquiry = {
  id: "00000000-0000-4000-8000-000000000104",
  version: 1,
  ownerUserId: identity.user.id,
  inquiryDate: "2026-01-02",
  source: "Synthetic source",
  message: "Synthetic inquiry",
  items: [],
  status: "FOLLOWING" as const,
  quoteId: null,
  createdAt: "2026-01-02T01:00:00.000Z",
  updatedAt: "2026-01-02T01:00:00.000Z",
  customerId: "00000000-0000-4000-8000-000000000103",
  customerVersion: 1,
};
const body = {
  customerId: inquiry.customerId,
  customerVersion: 1,
  inquiryDate: "2026-01-02",
  source: inquiry.source,
  message: inquiry.message,
  items: [
    {
      productId: "00000000-0000-4000-8000-000000000102",
      productVersion: 1,
      quantity: "1.20",
    },
  ],
};

function request(payload: unknown = body, withIdempotencyKey = true) {
  return new Request("http://localhost/api/v1/inquiries", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": "synthetic-csrf-token",
      ...(withIdempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(payload),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authorizeRequest.mockResolvedValue(identity);
  mocks.createInquiry.mockResolvedValue({
    inquiry,
    responseStatus: 201,
    replayed: false,
  });
});

describe("POST /api/v1/inquiries", () => {
  it("authorizes with CSRF and forwards the idempotency command", async () => {
    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.authorizeRequest).toHaveBeenCalledWith(expect.any(Request), {
      roles: ["sales"],
      csrf: true,
    });
    expect(mocks.createInquiry).toHaveBeenCalledWith(
      identity,
      body,
      expect.objectContaining({ idempotencyKey }),
    );
  });

  it("requires an idempotency key before business work", async () => {
    const response = await POST(request(body, false));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "MALFORMED_REQUEST" });
    expect(mocks.createInquiry).not.toHaveBeenCalled();
  });

  it("rejects unknown authorization fields", async () => {
    const response = await POST(request({ ...body, ownerUserId: identity.user.id }));
    expect(response.status).toBe(400);
    expect(mocks.createInquiry).not.toHaveBeenCalled();
  });

  it("does not turn CSRF failures into internal errors", async () => {
    mocks.authorizeRequest.mockRejectedValue(invalidCsrf());
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "CSRF_INVALID" });
    expect(mocks.createInquiry).not.toHaveBeenCalled();
  });
});
