import {
  authErrorResponse,
  authorizeRequest,
} from "@/server/auth";
import { createOrderFromQuote, orderCreateDto } from "@/server/modules/orders";
import {
  createRequestFingerprint,
  handleApi,
  jsonResponse,
  parseIdempotencyKey,
  parseResourceId,
  readJsonDto,
} from "@/server/shared";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  let identity;
  try {
    identity = await authorizeRequest(request, {
      roles: ["sales"],
      csrf: true,
    });
  } catch (error) {
    return authErrorResponse(error);
  }

  return handleApi(async (requestId) => {
    const { id } = await context.params;
    const quoteId = parseResourceId(id);
    const idempotencyKey = parseIdempotencyKey(request.headers);
    const input = await readJsonDto(request, orderCreateDto);
    const url = new URL(request.url);
    const requestHash = createRequestFingerprint({
      operationId: "createOrderFromQuote",
      method: request.method,
      path: url.pathname,
      query: url.searchParams,
      body: input,
    });
    const result = await createOrderFromQuote(identity, quoteId, input, {
      idempotencyKey,
      requestHash,
      requestId,
    });
    return jsonResponse(result.order, {
      status: result.status,
      replayed: result.replayed,
      requestId,
    });
  });
}
