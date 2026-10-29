import { describe, expect, it } from "vitest";

import {
  canonicalRequestBody,
  createRequestFingerprint,
} from "../../../src/server/shared/idempotency";

const base = {
  operationId: "updateQuote",
  method: "post",
  path: "/quotes/quote-1",
  query: "b=2&a=1",
  body: { quantity: "1.10", nested: { z: true, a: 1 } },
  decimalPaths: ["/quantity"],
};

describe("idempotency request fingerprints", () => {
  it("is stable across object key order and query parameter order", () => {
    // @tier durable
    const reordered = {
      ...base,
      query: "a=1&b=2",
      body: { nested: { a: 1, z: true }, quantity: "1.10" },
    };
    expect(createRequestFingerprint(reordered)).toBe(
      createRequestFingerprint(base),
    );
    expect(createRequestFingerprint(base)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("treats equivalent decimal strings as the same command at declared paths", () => {
    // @tier durable
    expect(
      createRequestFingerprint({ ...base, body: { ...base.body, quantity: "1.1" } }),
    ).toBe(createRequestFingerprint(base));
    expect(
      canonicalRequestBody(
        { items: [{ quantity: "0.10" }] },
        ["/items/*/quantity"],
      ),
    ).toEqual({ items: [{ quantity: "0.10" }] });
  });

  it("does not normalize ordinary business strings as decimals", () => {
    // @tier durable
    const left = createRequestFingerprint({
      ...base,
      body: { remark: "1.0" },
    });
    const right = createRequestFingerprint({
      ...base,
      body: { remark: "1.00" },
    });
    expect(left).not.toBe(right);
  });

  it("changes when operation, path, method, query or body changes", () => {
    // @tier durable
    const fingerprint = createRequestFingerprint(base);
    for (const changed of [
      { ...base, operationId: "submitQuote" },
      { ...base, path: "/quotes/quote-2" },
      { ...base, method: "put" },
      { ...base, query: "a=1&b=3" },
      { ...base, body: { ...base.body, quantity: "1.20" } },
    ]) {
      expect(createRequestFingerprint(changed)).not.toBe(fingerprint);
    }
  });
});
