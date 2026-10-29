import { describe, expect, it } from "vitest";

import { AuthError } from "../../../src/server/auth/errors";
import { parseLoginRequest } from "../../../src/server/auth/validation";

function requestWith(body: unknown, contentType = "application/json"): Request {
  return new Request("http://localhost/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("login request contract", () => {
  // @tier durable
  it("accepts only credentials and derives the login key on the server", async () => {
    const result = await parseLoginRequest(
      requestWith({ username: " Sales-A ", password: "secret" }),
    );

    expect(result).toEqual({
      username: " Sales-A ",
      password: "secret",
      loginKey: "sales-a",
    });
  });

  // @tier durable
  it("rejects client-supplied authorization fields without echoing secrets", async () => {
    for (const field of ["role", "actorUserId", "ownerUserId"]) {
      const error = await parseLoginRequest(
        requestWith({ username: "sales", password: "secret", [field]: "boss" }),
      ).catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(AuthError);
      expect(error).toMatchObject({ status: 400, code: "MALFORMED_REQUEST" });
      expect((error as AuthError).message).not.toContain("secret");
    }
  });

  // @tier durable
  it("distinguishes malformed input from field validation errors", async () => {
    await expect(parseLoginRequest(requestWith("{"))).rejects.toMatchObject({
      status: 400,
      code: "MALFORMED_REQUEST",
    });
    await expect(
      parseLoginRequest(requestWith({ username: "sales", password: "secret" }, "text/plain")),
    ).rejects.toMatchObject({ status: 400, code: "MALFORMED_REQUEST" });
    await expect(
      parseLoginRequest(requestWith({ username: "sales", password: "" })),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" });
  });
});
