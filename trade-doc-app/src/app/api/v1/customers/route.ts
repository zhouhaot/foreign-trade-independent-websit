import { authorizeRequest } from "@/server/auth";
import {
  createCustomer,
  customerCreateSchema,
  listCustomers,
} from "@/server/modules/customers";
import { handleCustomerApi } from "@/server/modules/customers/http";
import {
  createRequestFingerprint,
  jsonResponse,
  parseIdempotencyKey,
  parsePagination,
  readJsonDto,
} from "@/server/shared";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleCustomerApi(async (requestId) => {
    const identity = await authorizeRequest(request, {
      roles: ["sales", "boss"],
    });
    const url = new URL(request.url);
    const result = await listCustomers(identity, parsePagination(url.searchParams));
    return jsonResponse(result, { requestId });
  });
}

export async function POST(request: Request): Promise<Response> {
  return handleCustomerApi(async (requestId) => {
    const identity = await authorizeRequest(request, {
      roles: ["sales"],
      csrf: true,
    });
    const idempotencyKey = parseIdempotencyKey(request.headers);
    const input = await readJsonDto(request, customerCreateSchema);
    const url = new URL(request.url);
    const result = await createCustomer(identity, input, {
      idempotencyKey,
      requestHash: createRequestFingerprint({
        operationId: "createCustomer",
        method: request.method,
        path: url.pathname,
        query: url.searchParams,
        body: input,
      }),
      requestId,
    });
    return jsonResponse(result.customer, {
      status: result.status,
      replayed: result.replayed,
      requestId,
    });
  });
}
