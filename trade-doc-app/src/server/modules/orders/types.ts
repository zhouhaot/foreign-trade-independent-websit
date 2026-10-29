import type { Snapshot } from "../../db/schema";

export interface ProductSnapshot extends Snapshot {
  productId: string;
  productVersion: number;
  sku: string;
  nameCn: string;
  nameEn: string;
  spec: string;
  unit: string;
  hsCode: string;
  schemaVersion: 1;
}

export interface TradeSnapshotItem extends Snapshot {
  lineNo: number;
  product: ProductSnapshot;
  quantity: string;
  unitPrice: string;
  lineAmount: string;
  schemaVersion: 1;
}

export interface TradeSnapshot extends Snapshot {
  snapshotVersion: number;
  submittedQuoteVersion: number;
  seller: Snapshot;
  customer: Snapshot;
  quoteDate: string;
  validUntil: string;
  currency: string;
  tradeTerm: string;
  paymentTerm: string;
  remark: string;
  items: TradeSnapshotItem[];
  totalAmount: string;
  frozenAt: string;
  schemaVersion: 1;
}

export interface Order {
  id: string;
  version: number;
  ownerUserId: string;
  sourceQuoteId: string;
  sourceQuoteSnapshotVersion: number;
  customerConfirmationId: string;
  deliveryDate: string;
  trade: TradeSnapshot;
  orderProgress: "PENDING_EXECUTION";
  documentProgress: "NOT_STARTED";
  paymentProgress: "UNPAID";
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderInput {
  expectedVersion: number;
  deliveryDate: string;
}

export interface CreateOrderResult {
  order: Order;
  status: 200 | 201;
  replayed: boolean;
}
