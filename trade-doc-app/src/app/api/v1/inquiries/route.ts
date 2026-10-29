import { authorizeRequest } from "../../../../server/auth";
import {
  createInquiry,
  handleInquiryRequest,
  inquiryCreateSchema,
  listInquiries,
} from "../../../../server/modules/inquiries";
import {
  createRequestFingerprint,
  jsonResponse,
  parseIdempotencyKey,
  parsePagination,
  readJsonDto,
} from "../../../../server/shared";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleInquiryRequest(async (requestId) => {
    const identity = await authorizeRequest(request, {
      roles: ["sales", "boss"],
    });
    const pagination = parsePagination(new URL(request.url).searchParams);
    const result = await listInquiries(identity, pagination);
    return jsonResponse(result, { requestId });
  });
}

export async function POST(request: Request): Promise<Response> {
  return handleInquiryRequest(async (requestId) => {
    const identity = await authorizeRequest(request, {
      roles: ["sales"],
      csrf: true,
    });
    const idempotencyKey = parseIdempotencyKey(request.headers);
    const input = await readJsonDto(request, inquiryCreateSchema);
    const url = new URL(request.url);
    const requestHash = createRequestFingerprint({
      operationId: "createInquiry",
      method: request.method,
      path: url.pathname,
      query: url.searchParams,
      body: input,
      decimalPaths: ["/items/*/quantity"],
    });
    const result = await createInquiry(identity, input, {
      idempotencyKey,
      requestHash,
      requestId,
    });
    return jsonResponse(result.inquiry, {
      status: result.responseStatus,
      requestId,
      replayed: result.replayed,
    });
  });
}
