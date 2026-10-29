import { authErrorResponse, authorizeRequest } from "../../../../../../server/auth";
import {
  createQuote,
  quoteCreateSchema,
} from "../../../../../../server/modules/quotes";
import { readJsonDto } from "../../../../../../server/shared/dto";
import { handleApi, jsonResponse, parseIdempotencyKey, parseResourceId } from "../../../../../../server/shared/http";
import { createRequestFingerprint } from "../../../../../../server/shared/idempotency";

export const runtime = "nodejs";

export async function POST(
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
    const inquiryId = parseResourceId((await params).id);
    const input = await readJsonDto(request, quoteCreateSchema);
    const idempotencyKey = parseIdempotencyKey(request.headers);
    const url = new URL(request.url);
    const result = await createQuote(identity, inquiryId, input, {
      idempotencyKey,
      requestId,
      requestHash: createRequestFingerprint({
        operationId: "createQuote",
        method: "POST",
        path: url.pathname,
        query: url.searchParams,
        body: input,
      }),
    });
    return jsonResponse(result.data, {
      status: result.status,
      requestId,
      replayed: result.replayed,
    });
  });
}
