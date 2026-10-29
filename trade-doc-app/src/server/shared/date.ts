import { validationError } from "./errors";

export const DEFAULT_BUSINESS_TIME_ZONE = "Asia/Shanghai";
const DATE_PATTERN = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function isValidCalendarDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (match === null) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) {
    return false;
  }
  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return day <= daysInMonth[month - 1]!;
}

export function parseCalendarDate(value: string, path = "/date"): string {
  if (!isValidCalendarDate(value)) {
    throw validationError("日期格式或日历日期不正确", [
      {
        path,
        code: "invalid_date",
        message: "必须为真实日历日期 YYYY-MM-DD",
      },
    ]);
  }
  return value;
}

export function addCalendarDays(value: string, days: number): string {
  const date = parseCalendarDate(value);
  if (!Number.isSafeInteger(days)) {
    throw new TypeError("days must be a safe integer");
  }
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const result = new Date(0);
  result.setUTCHours(0, 0, 0, 0);
  result.setUTCFullYear(year, month - 1, day);
  result.setUTCDate(result.getUTCDate() + days);
  if (result.getUTCFullYear() < 1 || result.getUTCFullYear() > 9999) {
    throw validationError("日期计算结果超出支持范围");
  }
  const resultYear = String(result.getUTCFullYear()).padStart(4, "0");
  const resultMonth = String(result.getUTCMonth() + 1).padStart(2, "0");
  const resultDay = String(result.getUTCDate()).padStart(2, "0");
  return `${resultYear}-${resultMonth}-${resultDay}`;
}

export function businessDateFromInstant(
  instant: Date,
  timeZone = DEFAULT_BUSINESS_TIME_ZONE,
): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const values = new Map(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const value = `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
  return parseCalendarDate(value);
}

export function isDateBefore(left: string, right: string): boolean {
  return parseCalendarDate(left) < parseCalendarDate(right);
}
