import { expect } from "vitest";

import { ApiError } from "../../../src/server/shared/errors";

export function expectApiError(
  run: () => unknown,
  expected: object,
): ApiError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject(expected);
    return error as ApiError;
  }
  throw new Error("Expected ApiError");
}
