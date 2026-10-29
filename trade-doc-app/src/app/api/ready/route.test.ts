import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  getDb: () => ({ execute: mocks.execute }),
}));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.execute.mockResolvedValue([]);
});

describe("GET /api/ready", () => {
  it("checks the database without caching a ready response", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "ok" });
    expect(mocks.execute).toHaveBeenCalledOnce();
  });

  it("hides database failures and connection details", async () => {
    mocks.execute.mockRejectedValue(
      new Error("postgresql://synthetic-user:synthetic-password@database/app"),
    );

    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(JSON.parse(body)).toEqual({ status: "unavailable" });
    expect(body).not.toContain("synthetic-password");
    expect(body).not.toContain("postgresql://");
  });
});
