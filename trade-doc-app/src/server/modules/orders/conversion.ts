import type { Snapshot } from "../../db/schema";
import {
  isDateBefore,
  parseCalendarDate,
} from "../../shared/date";
import { ApiError, validationError } from "../../shared/errors";
import {
  calculateLineAmount,
  normalizeDecimal,
  sumAmounts,
} from "../../shared/money";
import type { TradeSnapshot } from "./types";

export interface ConversionQuote {
  state: string;
  rowVersion: number;
  validUntil: string | null;
}

export interface ConversionConfirmation {
  confirmedOn: string;
  confirmedSnapshot: Snapshot;
}

export function validateFirstConversion(
  quote: ConversionQuote,
  confirmation: ConversionConfirmation | null,
  expectedVersion: number,
  deliveryDate: string,
  businessDate: string,
): void {
  if (quote.state !== "CONFIRMED" || confirmation === null) {
    throw new ApiError(409, "STATE_CONFLICT", "报价尚未处于可成单状态", {
      currentVersion: quote.rowVersion,
    });
  }
  if (quote.rowVersion !== expectedVersion) {
    throw new ApiError(409, "VERSION_CONFLICT", "报价版本已变化，请重新审阅", {
      currentVersion: quote.rowVersion,
    });
  }
  if (quote.validUntil === null) {
    throw new Error("Confirmed quote has no validity date");
  }
  if (isDateBefore(quote.validUntil, businessDate)) {
    throw new ApiError(422, "QUOTE_EXPIRED", "报价已过有效期，暂不能成单", {
      fieldErrors: [
        {
          path: "/deliveryDate",
          code: "quote_expired",
          message: "报价已过有效期，暂不能成单",
        },
      ],
    });
  }

  parseCalendarDate(deliveryDate, "/deliveryDate");
  if (
    isDateBefore(deliveryDate, businessDate) ||
    isDateBefore(deliveryDate, confirmation.confirmedOn)
  ) {
    throw validationError("交期不得早于业务今天或客户确认日期", [
      {
        path: "/deliveryDate",
        code: "date_out_of_range",
        message: "交期不得早于业务今天或客户确认日期",
      },
    ]);
  }
}

export interface ConfirmedOrderLine {
  sourceQuoteLineId: string;
  lineNo: number;
  productSnapshot: Snapshot;
  quantity: string;
  unitPrice: string;
  lineAmount: string;
}

export function copyConfirmedOrderLines(
  quoteLines: readonly { id: string; lineNo: number }[],
  snapshotValue: Snapshot,
): ConfirmedOrderLine[] {
  const snapshot = snapshotValue as TradeSnapshot;
  if (
    !Array.isArray(snapshot.items) ||
    snapshot.items.length !== quoteLines.length
  ) {
    throw new Error("Confirmed snapshot lines do not match source quote lines");
  }

  const itemsByLineNo = new Map(
    snapshot.items.map((item) => [item.lineNo, item]),
  );
  if (itemsByLineNo.size !== snapshot.items.length) {
    throw new Error("Confirmed snapshot contains duplicate line numbers");
  }

  const lines = quoteLines.map((quoteLine) => {
    const item = itemsByLineNo.get(quoteLine.lineNo);
    if (item === undefined) {
      throw new Error("Confirmed snapshot is missing a source quote line");
    }
    const path = `/items/${quoteLine.lineNo}`;
    const quantity = normalizeDecimal(item.quantity, {
      allowZero: false,
      path: `${path}/quantity`,
    });
    const unitPrice = normalizeDecimal(item.unitPrice, {
      allowZero: false,
      path: `${path}/unitPrice`,
    });
    const lineAmount = normalizeDecimal(item.lineAmount, {
      path: `${path}/lineAmount`,
    });
    if (calculateLineAmount(quantity, unitPrice, path) !== lineAmount) {
      throw new Error("Confirmed snapshot line amount is inconsistent");
    }
    return {
      sourceQuoteLineId: quoteLine.id,
      lineNo: quoteLine.lineNo,
      productSnapshot: item.product,
      quantity,
      unitPrice,
      lineAmount,
    };
  });

  if (
    sumAmounts(lines.map((line) => line.lineAmount)) !==
    normalizeDecimal(snapshot.totalAmount, { path: "/totalAmount" })
  ) {
    throw new Error("Confirmed snapshot total amount is inconsistent");
  }
  return lines;
}
