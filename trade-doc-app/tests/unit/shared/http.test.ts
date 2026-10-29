import { describe, expect, it } from "vitest";

import {
  pageResult,
  parseIdempotencyKey,
  parsePagination,
  parseResourceId,
} from "../../../src/server/shared/http";
import { expectApiError } from "./test-utils";

const ID = "123e4567-e89b-42d3-a456-426614174000";

describe("HTTP boundary parsers", () => {
  it("accepts UUIDs and normalizes their casing", () => {
    // @tier durable
    expect(parseResourceId(ID.toUpperCase())).toBe(ID);
    expect(
      parseIdempotencyKey(new Headers({ "Idempotency-Key": ID.toUpperCase() })),
    ).toBe(ID);
  });

  it("rejects missing or malformed IDs and idempotency keys", () => {
    // @tier durable
    expectApiError(() => parseResourceId("customer-1"), {
      status: 400,
      code: "MALFORMED_REQUEST",
    });
    expectApiError(() => parseIdempotencyKey(new Headers()), {
      status: 400,
      code: "MALFORMED_REQUEST",
    });
    expectApiError(
      () =>
        parseIdempotencyKey(
          new Headers({ "Idempotency-Key": "not-a-uuid" }),
        ),
      { status: 400 },
    );
  });

  it("uses contract pagination defaults and computes the offset", () => {
    // @tier durable
    expect(parsePagination(new URLSearchParams())).toEqual({
      page: 1,
      pageSize: 20,
      offset: 0,
      q: "",
    });
    expect(
      parsePagination(new URLSearchParams("page=3&pageSize=25&q=abc")),
    ).toEqual({ page: 3, pageSize: 25, offset: 50, q: "abc" });
  });

  it("rejects duplicate, fractional, zero, oversized and unsafe pagination", () => {
    // @tier durable
    for (const query of [
      "page=1&page=2",
      "page=1.5",
      "page=0",
      "pageSize=101",
      "pageSize=-1",
      "page=999999999999999999",
      "q=a&q=b",
    ]) {
      expectApiError(() => parsePagination(new URLSearchParams(query)), {
        status: 400,
      });
    }
  });

  it("preserves total pages for empty and out-of-range result pages", () => {
    // @tier durable
    const pagination = parsePagination(
      new URLSearchParams("page=5&pageSize=20"),
    );
    expect(pageResult([], pagination, 41)).toEqual({
      items: [],
      page: 5,
      pageSize: 20,
      total: 41,
      totalPages: 3,
    });
    expect(pageResult([], pagination, 0).totalPages).toBe(0);
  });
});
