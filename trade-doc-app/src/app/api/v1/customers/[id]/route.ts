import { authorizeRequest } from "@/server/auth";
import {
  customerUpdateSchema,
  getCustomer,
  updateCustomer,
} from "@/server/modules/customers";
import { handleCustomerApi } from "@/server/modules/customers/http";
import {
  createRequestFingerprint,
  jsonResponse,
  parseIdempotencyKey,
  parseResourceId,
  readJsonDto,
} from "@/server/shared";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  return handleCustomerApi(async (requestId) => {
    const identity = await authorizeRequest(request, {
      roles: ["sales", "boss"],
    });
    const { id } = await context.params;
    const result = await getCustomer(identity, parseResourceId(id));
    return jsonResponse(result, { requestId });
  });
}

export async function PUT(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  return handleCustomerApi(async (requestId) => {
    const identity = await authorizeRequest(request, {
      roles: ["sales"],
      csrf: true,
    });
    const idempotencyKey = parseIdempotencyKey(request.headers);
    const { id: rawId } = await context.params;
    const id = parseResourceId(rawId);
    const input = await readJsonDto(request, customerUpdateSchema);
    const url = new URL(request.url);
    const result = await updateCustomer(identity, id, input, {
      idempotencyKey,
      requestHash: createRequestFingerprint({
        operationId: "updateCustomer",
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
