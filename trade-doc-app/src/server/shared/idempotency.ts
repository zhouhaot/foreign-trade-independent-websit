import { createHash } from "node:crypto";

import { normalizeDecimal } from "./money";

export interface RequestFingerprintInput {
  operationId: string;
  method: string;
  path: string;
  query?: string | URLSearchParams;
  body: unknown;
  decimalPaths?: readonly string[];
}

function escapePointerSegment(segment: string): string {
  return segment.replaceAll("~", "~0").replaceAll("/", "~1");
}

function canonicalize(
  value: unknown,
  path: string,
  wildcardPath: string,
  decimalPaths: ReadonlySet<string>,
): unknown {
  if (
    typeof value === "string" &&
    (decimalPaths.has(path) || decimalPaths.has(wildcardPath))
  ) {
    return normalizeDecimal(value, { path });
  }
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      canonicalize(
        item,
        `${path}/${index}`,
        `${wildcardPath}/*`,
        decimalPaths,
      ),
    );
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => {
          const segment = escapePointerSegment(key);
          return [
            key,
            canonicalize(
              item,
              `${path}/${segment}`,
              `${wildcardPath}/${segment}`,
              decimalPaths,
            ),
          ];
        }),
    );
  }
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return value;
  }
  throw new TypeError("Request body must contain JSON values only");
}

export function canonicalRequestBody(
  body: unknown,
  decimalPaths: readonly string[] = [],
): unknown {
  return canonicalize(body, "", "", new Set(decimalPaths));
}

export function createRequestFingerprint(
  input: RequestFingerprintInput,
): string {
  const query = [...new URLSearchParams(input.query).entries()].sort(
    ([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue),
  );
  const canonical = JSON.stringify({
    operationId: input.operationId,
    method: input.method.toUpperCase(),
    path: input.path,
    query,
    body: canonicalRequestBody(input.body, input.decimalPaths),
  });
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
