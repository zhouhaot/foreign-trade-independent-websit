import { authErrorResponse, authorizeRequest } from "../../../../../server/auth";
import {
  getQuote,
  quoteUpdateSchema,
  updateQuote,
} from "../../../../../server/modules/quotes";
import { readJsonDto } from "../../../../../server/shared/dto";
import { handleApi, jsonResponse, parseIdempotencyKey, parseResourceId } from "../../../../../server/shared/http";
import { createRequestFingerprint } from "../../../../../server/shared/idempotency";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  let identity;
  try {
    identity = await authorizeRequest(request, { roles: ["sales", "boss"] });
  } catch (error) {
    return authErrorResponse(error);
  }
  return handleApi(async (requestId) => {
    const id = parseResourceId((await params).id);
    const result = await getQuote(identity, id);
    return jsonResponse(result, { requestId });
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
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
    const id = parseResourceId((await params).id);
    const input = await readJsonDto(request, quoteUpdateSchema);
    const idempotencyKey = parseIdempotencyKey(request.headers);
    const url = new URL(request.url);
    const result = await updateQuote(identity, id, input, {
      idempotencyKey,
      requestId,
      requestHash: createRequestFingerprint({
        operationId: "updateQuote",
        method: "PUT",
        path: url.pathname,
        query: url.searchParams,
        body: input,
        decimalPaths: ["/items/*/quantity", "/items/*/unitPrice"],
      }),
    });
    return jsonResponse(result.data, {
      status: result.status,
      requestId,
      replayed: result.replayed,
    });
  });
}
