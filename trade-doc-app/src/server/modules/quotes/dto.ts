import { z } from "zod";

import { strictDto } from "../../shared/dto";

const version = z.number().int().min(1).max(2147483647);
const decimalString = z
  .string()
  .max(21)
  .regex(/^(?:0|[1-9][0-9]{0,17})(?:\.[0-9]{1,2})?$/);
const calendarDate = z.string().length(10).regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
const currency = z.string().length(3).regex(/^[A-Z]{3}$/);

export const quoteCreateSchema = strictDto({
  expectedVersion: version,
  currency,
});

export const quoteUpdateSchema = strictDto({
  expectedVersion: version,
  validUntil: z.union([calendarDate, z.null()]),
  currency,
  tradeTerm: z.string().max(200),
  paymentTerm: z.string().max(500),
  remark: z.string().max(2000),
  items: z
    .array(
      strictDto({
        lineNo: z.number().int().min(1).max(100),
        quantity: decimalString,
        unitPrice: z.union([decimalString, z.null()]),
      }),
    )
    .min(1)
    .max(100),
});

export const quoteSubmitSchema = strictDto({
  expectedVersion: version,
  expectedCustomerVersion: version,
  expectedCompanyProfileVersion: version,
});

export const confirmationCreateSchema = strictDto({
  expectedVersion: version,
  method: z.string().min(1).max(100),
  confirmedOn: calendarDate,
  note: z.string().min(1).max(2000),
  attachmentIds: z.array(z.uuid()).optional(),
});

export type QuoteCreateInput = z.infer<typeof quoteCreateSchema>;
export type QuoteUpdateInput = z.infer<typeof quoteUpdateSchema>;
export type QuoteSubmitInput = z.infer<typeof quoteSubmitSchema>;
export type ConfirmationCreateInput = z.infer<typeof confirmationCreateSchema>;
