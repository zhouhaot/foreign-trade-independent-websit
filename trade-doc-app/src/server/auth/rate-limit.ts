interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export class FixedWindowRateLimiter {
  private readonly entries = new Map<string, RateLimitEntry>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {
    if (!Number.isInteger(limit) || limit < 1 || windowMs < 1) {
      throw new Error("Invalid rate limit configuration");
    }
  }

  consume(key: string): RateLimitResult {
    const now = this.now();
    const existing = this.entries.get(key);

    if (!existing || existing.resetAt <= now) {
      this.entries.set(key, { count: 1, resetAt: now + this.windowMs });
      this.removeExpired(now);
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (existing.count >= this.limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((existing.resetAt - now) / 1000),
        ),
      };
    }

    existing.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }

  private removeExpired(now: number): void {
    if (this.entries.size < 1_000) {
      return;
    }

    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) {
        this.entries.delete(key);
      }
    }
  }
}

function positiveIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

export function requestSource(request: Request): string {
  if (process.env.TRADE_TRUST_PROXY !== "true") {
    return "direct";
  }

  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",", 1)[0]?.trim() || "unknown";
}

const authRequestLimiter = new FixedWindowRateLimiter(
  positiveIntegerEnv("AUTH_REQUEST_RATE_LIMIT", 120),
  positiveIntegerEnv("AUTH_REQUEST_RATE_WINDOW_MS", 60_000),
);

const loginLimiter = new FixedWindowRateLimiter(
  positiveIntegerEnv("AUTH_LOGIN_RATE_LIMIT", 10),
  positiveIntegerEnv("AUTH_LOGIN_RATE_WINDOW_MS", 15 * 60_000),
);

export function consumeAuthRequest(
  request: Request,
  operation: string,
): RateLimitResult {
  return authRequestLimiter.consume(`${operation}:${requestSource(request)}`);
}

export function consumeLoginAttempt(
  request: Request,
  loginKey: string,
): RateLimitResult {
  return loginLimiter.consume(`${requestSource(request)}:${loginKey}`);
}
