import { AuthError } from "./errors";
import { consumeAuthRequest } from "./rate-limit";

export function guardAuthRequest(request: Request, operation: string): void {
  const result = consumeAuthRequest(request, operation);
  if (!result.allowed) {
    throw new AuthError(429, "RATE_LIMITED", "请求过于频繁", [], {
      "Retry-After": String(result.retryAfterSeconds),
    });
  }
}
