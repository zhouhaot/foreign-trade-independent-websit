export type Role = "admin" | "sales" | "doc" | "fin" | "boss";

export type User = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
};

export type Session = { user: User };

export type FieldError = {
  path: string;
  code: string;
  message: string;
};

export type ErrorBody = {
  status: number;
  code: string;
  message: string;
  requestId: string;
  fieldErrors: FieldError[];
  currentVersion?: number;
};

export type Page<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type Currency = {
  code: string;
  displayName: string;
  amountScale: 2;
};

export type Product = {
  id: string;
  version: number;
  sku: string;
  nameCn: string;
  nameEn: string;
  spec: string;
  unit: string;
  refPrice: string;
  currency: string;
  hsCode: string;
  remark: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductInput = Pick<
  Product,
  "sku" | "nameCn" | "nameEn" | "spec" | "unit" | "refPrice" | "currency" | "hsCode" | "remark"
>;

export type Customer = {
  id: string;
  version: number;
  ownerUserId: string;
  nameCn: string;
  nameEn: string;
  country: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerInput = Pick<
  Customer,
  "nameCn" | "nameEn" | "country" | "contact" | "email" | "phone" | "address" | "remark"
>;

export type ProductSnapshot = {
  productId: string;
  productVersion: number;
  sku: string;
  nameCn: string;
  nameEn: string;
  spec: string;
  unit: string;
  hsCode: string;
  schemaVersion: 1;
};

export type CustomerSnapshot = {
  customerId: string;
  customerVersion: number;
  nameCn: string;
  nameEn: string;
  country: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  schemaVersion: 1;
};

export type CompanySnapshot = {
  companyProfileId: string;
  companyProfileVersion: number;
  legalName: string;
  address: string;
  contact: string;
  email: string;
  phone: string;
  schemaVersion: 1;
};

export type InquiryItem = {
  lineNo: number;
  product: ProductSnapshot;
  quantity: string;
};

export type Inquiry = {
  id: string;
  businessNo?: string;
  version: number;
  ownerUserId: string;
  inquiryDate: string;
  source: string;
  message: string;
  items: InquiryItem[];
  status: "FOLLOWING" | "QUOTED";
  quoteId: string | null;
  createdAt: string;
  updatedAt: string;
  customerId: string;
  customerVersion: number;
};

export type QuoteItem = {
  lineNo: number;
  product: ProductSnapshot;
  quantity: string;
  unitPrice: string | null;
  lineAmount: string | null;
};

export type TradeSnapshotItem = QuoteItem & {
  unitPrice: string;
  lineAmount: string;
  schemaVersion: 1;
};

export type TradeSnapshot = {
  snapshotVersion: number;
  submittedQuoteVersion: number;
  seller: CompanySnapshot;
  customer: CustomerSnapshot;
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
};

export type CustomerConfirmation = {
  id: string;
  quoteSnapshotVersion: number;
  method: string;
  confirmedOn: string;
  note: string;
  attachmentIds: string[];
  recordedBy: string;
  recordedAt: string;
};

export type Quote = {
  id: string;
  businessNo?: string;
  version: number;
  ownerUserId: string;
  inquiryId: string;
  quoteDate: string;
  validUntil: string | null;
  currency: string;
  tradeTerm: string;
  paymentTerm: string;
  remark: string;
  items: QuoteItem[];
  totalAmount: string | null;
  status: "DRAFT" | "AWAITING_CUSTOMER" | "CONFIRMED";
  submittedSnapshot: TradeSnapshot | null;
  customerConfirmation: CustomerConfirmation | null;
  orderId: string | null;
  createdAt: string;
  updatedAt: string;
  convertedAt: string | null;
  customerId: string;
  customerSnapshot: CustomerSnapshot;
  companySnapshot: CompanySnapshot | null;
  sourceVersions: {
    customerVersion: number;
    companyProfileVersion: number | null;
  };
};

export type Order = {
  id: string;
  businessNo?: string;
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
};
