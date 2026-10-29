import { describe, expect, it } from "vitest";

import {
  clearSessionCookie,
  readSessionCookie,
  sessionCookie,
} from "../../../src/server/auth/http";
import { createOpaqueToken } from "../../../src/server/auth/tokens";

describe("authentication HTTP boundary", () => {
  // @tier durable
  it("scopes the opaque session cookie to the API with all required flags", () => {
    const token = createOpaqueToken();
    const cookie = sessionCookie(token, 3600);

    expect(cookie).toContain(`TRADE_SESSION=${token}`);
    expect(cookie).toContain("Path=/api/v1");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Max-Age=3600");
    expect(cookie.toLowerCase()).not.toContain("domain=");
  });

  // @tier durable
  it("clears the same cookie path and rejects duplicate session cookies", () => {
    const token = createOpaqueToken();
    expect(clearSessionCookie()).toContain("Path=/api/v1");
    expect(clearSessionCookie()).toContain("Max-Age=0");

    const request = (cookie: string) =>
      new Request("http://localhost/api/v1/auth/me", {
        headers: { Cookie: cookie },
      });
    expect(readSessionCookie(request(`TRADE_SESSION=${token}`))).toBe(token);
    expect(
      readSessionCookie(
        request(`TRADE_SESSION=${token}; TRADE_SESSION=${createOpaqueToken()}`),
      ),
    ).toBeNull();
    expect(readSessionCookie(request("TRADE_SESSION=short"))).toBeNull();
  });
});
