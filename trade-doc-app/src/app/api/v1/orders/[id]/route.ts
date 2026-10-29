import {
  authErrorResponse,
  authorizeRequest,
} from "@/server/auth";
import { getOrder } from "@/server/modules/orders";
import {
  handleApi,
  jsonResponse,
  parseResourceId,
} from "@/server/shared";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  let identity;
  try {
    identity = await authorizeRequest(request, { roles: ["sales", "boss"] });
  } catch (error) {
    return authErrorResponse(error);
  }

  return handleApi(async (requestId) => {
    const { id } = await context.params;
    const order = await getOrder(identity, parseResourceId(id));
    return jsonResponse(order, { requestId });
  });
}
