import {
  authErrorResponse,
  authorizeRequest,
} from "@/server/auth";
import { listOrders } from "@/server/modules/orders";
import {
  handleApi,
  jsonResponse,
  parsePagination,
} from "@/server/shared";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  let identity;
  try {
    identity = await authorizeRequest(request, { roles: ["sales", "boss"] });
  } catch (error) {
    return authErrorResponse(error);
  }

  return handleApi(async (requestId) => {
    const pagination = parsePagination(new URL(request.url).searchParams);
    const result = await listOrders(identity, pagination);
    return jsonResponse(result, { requestId });
  });
}
