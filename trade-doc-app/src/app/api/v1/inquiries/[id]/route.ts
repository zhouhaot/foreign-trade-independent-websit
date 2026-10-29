import { authorizeRequest } from "../../../../../server/auth";
import {
  getInquiry,
  handleInquiryRequest,
} from "../../../../../server/modules/inquiries";
import {
  jsonResponse,
  parseResourceId,
} from "../../../../../server/shared";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  return handleInquiryRequest(async (requestId) => {
    const identity = await authorizeRequest(request, {
      roles: ["sales", "boss"],
    });
    const { id } = await context.params;
    const inquiry = await getInquiry(identity, parseResourceId(id));
    return jsonResponse(inquiry, { requestId });
  });
}
