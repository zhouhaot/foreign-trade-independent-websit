import { describe, expect, it } from "vitest";

import {
  addCalendarDays,
  businessDateFromInstant,
  isDateBefore,
  isValidCalendarDate,
  parseCalendarDate,
} from "../../../src/server/shared/date";
import { expectApiError } from "./test-utils";

describe("business calendar dates", () => {
  it("accepts real leap days and rejects impossible calendar dates", () => {
    // @tier durable
    expect(isValidCalendarDate("2024-02-29")).toBe(true);
    expect(isValidCalendarDate("2000-02-29")).toBe(true);
    for (const value of [
      "2023-02-29",
      "1900-02-29",
      "2026-04-31",
      "2026-13-01",
      "2026-00-01",
      "0000-01-01",
      "2026-1-01",
      "2026-01-01T00:00:00Z",
    ]) {
      expect(isValidCalendarDate(value)).toBe(false);
      expectApiError(() => parseCalendarDate(value), {
        status: 422,
        code: "VALIDATION_ERROR",
      });
    }
  });

  it("adds calendar days across month, year and leap-day boundaries", () => {
    // @tier durable
    expect(addCalendarDays("2026-01-31", 15)).toBe("2026-02-15");
    expect(addCalendarDays("2024-02-15", 15)).toBe("2024-03-01");
    expect(addCalendarDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addCalendarDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("derives the business date in Asia/Shanghai, not the UTC date", () => {
    // @tier durable
    expect(
      businessDateFromInstant(new Date("2026-10-28T15:59:59.999Z")),
    ).toBe("2026-10-28");
    expect(
      businessDateFromInstant(new Date("2026-10-28T16:00:00.000Z")),
    ).toBe("2026-10-29");
    expect(
      businessDateFromInstant(
        new Date("2026-10-28T23:00:00.000Z"),
        "America/Los_Angeles",
      ),
    ).toBe("2026-10-28");
  });

  it("compares validated dates chronologically", () => {
    // @tier durable
    expect(isDateBefore("2026-02-01", "2026-02-02")).toBe(true);
    expect(isDateBefore("2026-02-02", "2026-02-02")).toBe(false);
    expect(() => isDateBefore("2026-02-30", "2026-03-01")).toThrow();
  });
});
