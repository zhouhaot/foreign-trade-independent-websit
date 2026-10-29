import { z } from "zod";

import { isValidCalendarDate, strictDto } from "../../shared";

const versionSchema = z.number().int().min(1).max(2147483647);
const decimalSchema = z
  .string()
  .max(21)
  .regex(/^(?:0|[1-9][0-9]{0,17})(?:\.[0-9]{1,2})?$/);

export const inquiryItemInputSchema = strictDto({
  productId: z.uuid(),
  productVersion: versionSchema,
  quantity: decimalSchema,
});

export const inquiryCreateSchema = strictDto({
  customerId: z.uuid(),
  customerVersion: versionSchema,
  inquiryDate: z
    .string()
    .length(10)
    .refine(isValidCalendarDate, "必须为真实日历日期"),
  source: z.string().min(1).max(100),
  message: z.string().min(1).max(5000),
  items: z.array(inquiryItemInputSchema).min(1).max(100),
});

export type InquiryCreateInput = z.infer<typeof inquiryCreateSchema>;
