import type { QuoteUpdateInput } from "./dto";

type QuoteItemUpdateInput = QuoteUpdateInput["items"][number];
import {
  calculateLineAmount,
  normalizeDecimal,
  sumAmounts,
} from "../../shared/money";
import { validationError } from "../../shared/errors";

export interface CalculatedQuoteLine {
  lineNo: number;
  quantity: string;
  unitPrice: string | null;
  lineAmount: string | null;
}

export interface CalculatedQuoteCandidate {
  lines: CalculatedQuoteLine[];
  totalAmount: string | null;
}

export function calculateQuoteCandidate(
  originalLineNos: readonly number[],
  items: readonly QuoteItemUpdateInput[],
): CalculatedQuoteCandidate {
  const original = new Set(originalLineNos);
  const candidates = new Map<number, CalculatedQuoteLine>();

  for (const [index, item] of items.entries()) {
    if (!original.has(item.lineNo) || candidates.has(item.lineNo)) {
      throw validationError("明细必须恰好覆盖原报价的每个 lineNo", [
        {
          path: `/items/${index}/lineNo`,
          code: "line_no_mismatch",
          message: "不得遗漏、重复或新增 lineNo",
        },
      ]);
    }

    const linePath = `/items/${index}`;
    const quantity = normalizeDecimal(item.quantity, {
      allowZero: false,
      path: `${linePath}/quantity`,
    });
    const unitPrice =
      item.unitPrice === null
        ? null
        : normalizeDecimal(item.unitPrice, {
            allowZero: false,
            path: `${linePath}/unitPrice`,
          });
    candidates.set(item.lineNo, {
      lineNo: item.lineNo,
      quantity,
      unitPrice,
      lineAmount:
        unitPrice === null
          ? null
          : calculateLineAmount(quantity, unitPrice, linePath),
    });
  }

  if (candidates.size !== original.size) {
    throw validationError("明细必须恰好覆盖原报价的每个 lineNo", [
      {
        path: "/items",
        code: "incomplete_line_nos",
        message: "不得遗漏、重复或新增 lineNo",
      },
    ]);
  }

  const lines = originalLineNos.map((lineNo) => candidates.get(lineNo)!);
  const amounts = lines.map((line) => line.lineAmount);
  return {
    lines,
    totalAmount: amounts.some((amount) => amount === null)
      ? null
      : sumAmounts(amounts as string[]),
  };
}
