import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  parseDto,
  readJsonDto,
  strictDto,
} from "../../../src/server/shared/dto";
import { ApiError } from "../../../src/server/shared/errors";

const customerDto = strictDto({
  name: z.string().min(1),
  items: z.array(strictDto({ quantity: z.string() })),
});

function requestWith(body: string, contentType = "application/json"): Request {
  return new Request("http://localhost/api/v1/customers", {
    method: "POST",
    headers: { "content-type": contentType },
    body,
  });
}

function expectApiError(
  run: () => unknown,
  status: number,
  code: string,
): ApiError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.status).toBe(status);
    expect(apiError.code).toBe(code);
    return apiError;
  }
  throw new Error("Expected ApiError");
}

describe("strict JSON DTO boundary", () => {
  it("parses valid nested DTOs", async () => {
    // @tier durable
    const result = await readJsonDto(
      requestWith('{"name":"Customer","items":[{"quantity":"1.00"}]}'),
      customerDto,
    );

    expect(result).toEqual({
      name: "Customer",
      items: [{ quantity: "1.00" }],
    });
  });

  it("rejects unknown authorization fields with HTTP 400", () => {
    // @tier durable
    const error = expectApiError(
      () =>
        parseDto(customerDto, {
          name: "Customer",
          items: [],
          ownerUserId: "another-user",
        }),
      400,
      "MALFORMED_REQUEST",
    );

    expect(error.fieldErrors[0]).toMatchObject({
      path: "/",
      code: "unrecognized_keys",
    });
  });

  it("rejects unknown nested fields instead of silently dropping them", () => {
    // @tier durable
    expectApiError(
      () =>
        parseDto(customerDto, {
          name: "Customer",
          items: [{ quantity: "1.00", productId: "replacement" }],
        }),
      400,
      "MALFORMED_REQUEST",
    );
  });

  it("separates type failures from field value failures", () => {
    // @tier durable
    expectApiError(
      () => parseDto(customerDto, { name: 1, items: [] }),
      400,
      "MALFORMED_REQUEST",
    );
    const error = expectApiError(
      () => parseDto(customerDto, { name: "", items: [] }),
      422,
      "VALIDATION_ERROR",
    );
    expect(error.fieldErrors[0]?.path).toBe("/name");
  });

  it("rejects malformed JSON and non-JSON content types", async () => {
    // @tier durable
    await expect(
      readJsonDto(requestWith("{"), customerDto),
    ).rejects.toMatchObject({ status: 400, code: "MALFORMED_REQUEST" });
    await expect(
      readJsonDto(
        requestWith('{"name":"Customer","items":[]}', "text/plain"),
        customerDto,
      ),
    ).rejects.toMatchObject({ status: 400, code: "MALFORMED_REQUEST" });
  });
});
