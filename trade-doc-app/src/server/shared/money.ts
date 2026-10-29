import { ApiError, validationError } from "./errors";

const DECIMAL_PATTERN = /^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/;
const MAX_MINOR_UNITS = 99999999999999999999n;
const ONE_HUNDRED = 100n;

export interface DecimalOptions {
  allowZero?: boolean;
  path?: string;
}

function moneyError(
  code: "VALIDATION_ERROR" | "AMOUNT_NOT_EXACT" | "AMOUNT_OVERFLOW",
  message: string,
  path: string,
): ApiError {
  return new ApiError(422, code, message, {
    fieldErrors: [{ path, code: code.toLowerCase(), message }],
  });
}

function checkUpperBound(minorUnits: bigint, path: string): void {
  if (minorUnits > MAX_MINOR_UNITS) {
    throw moneyError(
      "AMOUNT_OVERFLOW",
      "金额超过 18 位整数和 2 位小数的上限",
      path,
    );
  }
}

export function decimalToMinorUnits(
  value: string,
  options: DecimalOptions = {},
): bigint {
  const path = options.path ?? "/amount";
  if (typeof value !== "string" || !DECIMAL_PATTERN.test(value)) {
    throw validationError("十进制金额格式不正确", [
      {
        path,
        code: "invalid_decimal",
        message: "必须为无符号普通十进制字符串，最多两位小数",
      },
    ]);
  }

  const [integer = "", fraction = ""] = value.split(".");
  if (integer.length > 18) {
    throw moneyError(
      "AMOUNT_OVERFLOW",
      "金额超过 18 位整数和 2 位小数的上限",
      path,
    );
  }
  const minorUnits = BigInt(integer) * ONE_HUNDRED + BigInt(fraction.padEnd(2, "0") || "0");
  if (options.allowZero === false && minorUnits === 0n) {
    throw validationError("数值必须大于零", [
      { path, code: "not_positive", message: "数值必须大于零" },
    ]);
  }
  return minorUnits;
}

export function minorUnitsToDecimal(minorUnits: bigint): string {
  if (minorUnits < 0n) {
    throw new TypeError("minorUnits must not be negative");
  }
  checkUpperBound(minorUnits, "/amount");
  const integer = (minorUnits / ONE_HUNDRED).toString();
  const fraction = (minorUnits % ONE_HUNDRED).toString().padStart(2, "0");
  return `${integer}.${fraction}`;
}

export function normalizeDecimal(
  value: string,
  options: DecimalOptions = {},
): string {
  return minorUnitsToDecimal(decimalToMinorUnits(value, options));
}

export function calculateLineAmount(
  quantity: string,
  unitPrice: string,
  linePath = "/line",
): string {
  const quantityMinorUnits = decimalToMinorUnits(quantity, {
    allowZero: false,
    path: `${linePath}/quantity`,
  });
  const priceMinorUnits = decimalToMinorUnits(unitPrice, {
    allowZero: false,
    path: `${linePath}/unitPrice`,
  });
  const product = quantityMinorUnits * priceMinorUnits;
  if (product % ONE_HUNDRED !== 0n) {
    throw moneyError(
      "AMOUNT_NOT_EXACT",
      "数量与单价的乘积不能精确到分",
      `${linePath}/lineAmount`,
    );
  }
  const lineMinorUnits = product / ONE_HUNDRED;
  checkUpperBound(lineMinorUnits, `${linePath}/lineAmount`);
  return minorUnitsToDecimal(lineMinorUnits);
}

export function sumAmounts(amounts: readonly string[]): string {
  let total = 0n;
  for (const [index, amount] of amounts.entries()) {
    total += decimalToMinorUnits(amount, { path: `/items/${index}/lineAmount` });
    checkUpperBound(total, "/totalAmount");
  }
  return minorUnitsToDecimal(total);
}
