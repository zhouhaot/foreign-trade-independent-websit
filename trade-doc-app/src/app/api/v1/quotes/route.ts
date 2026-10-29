import { authErrorResponse, authorizeRequest } from "../../../../server/auth";
import { listQuotes } from "../../../../server/modules/quotes";
import { handleApi, jsonResponse, parsePagination } from "../../../../server/shared/http";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  let identity;
  try {
    identity = await authorizeRequest(request, { roles: ["sales", "boss"] });
  } catch (error) {
    return authErrorResponse(error);
  }
  return handleApi(async (requestId) => {
    const result = await listQuotes(
      identity,
      parsePagination(new URL(request.url).searchParams),
    );
    return jsonResponse(result, { requestId });
  });
}
