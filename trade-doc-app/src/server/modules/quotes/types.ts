import type { Quote } from "../../../lib/contracts";

export interface QuoteCommandContext {
  idempotencyKey: string;
  requestHash: string;
  requestId: string;
}

export interface QuoteCommandResult {
  data: Quote;
  status: 200 | 201;
  replayed: boolean;
}
