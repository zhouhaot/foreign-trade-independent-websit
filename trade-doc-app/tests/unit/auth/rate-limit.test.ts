import { describe, expect, it, vi } from "vitest";

import { FixedWindowRateLimiter } from "../../../src/server/auth/rate-limit";

describe("authentication rate limiting", () => {
  // @tier durable
  it("blocks requests over the limit and reports a positive retry delay", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const limiter = new FixedWindowRateLimiter(2, 60_000);

    expect(limiter.consume("sales").allowed).toBe(true);
    expect(limiter.consume("sales").allowed).toBe(true);
    expect(limiter.consume("sales")).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
    expect(limiter.consume("other").allowed).toBe(true);

    vi.advanceTimersByTime(60_000);
    expect(limiter.consume("sales").allowed).toBe(true);
    vi.useRealTimers();
  });

  // @tier durable
  it("rejects unsafe limiter configuration", () => {
    expect(() => new FixedWindowRateLimiter(0, 1000)).toThrow();
    expect(() => new FixedWindowRateLimiter(1.5, 1000)).toThrow();
    expect(() => new FixedWindowRateLimiter(1, 0)).toThrow();
  });
});
